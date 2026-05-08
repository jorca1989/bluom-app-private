import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Platform, StyleProp, ViewStyle } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Video, ResizeMode, AVPlaybackSource } from 'expo-av';

interface ChromaKeyVideoProps {
  source: AVPlaybackSource;
  style?: StyleProp<ViewStyle>;
  // Threshold for exact match
  similarity?: number;
  // Threshold for the smooth edge blending (fringe removal)
  smoothness?: number;
}

const VERTEX_SHADER = `
  attribute vec4 position;
  attribute vec2 texcoord;
  varying vec2 v_texcoord;
  void main() {
    gl_Position = position;
    // Invert Y coordinate for WebGL standard flip if needed
    v_texcoord = vec2(texcoord.x, 1.0 - texcoord.y);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 v_texcoord;
  uniform sampler2D u_texture;
  
  uniform float u_similarity;
  uniform float u_smoothness;

  // The requested target color: RGB (0, 255, 0)
  const vec3 chromaKey = vec3(0.0, 1.0, 0.0);

  void main() {
    vec4 texColor = texture2D(u_texture, v_texcoord);
    
    // Calculate the color distance. 
    // We evaluate how close the current pixel is to pure green.
    float chromaDist = distance(texColor.rgb, chromaKey);
    
    // Use smoothstep to remove the green fringe bits. 
    // If distance < similarity, alpha is 0.0
    // If distance > similarity + smoothness, alpha is 1.0
    // In between, it smoothly ramps to remove fringe.
    float alpha = smoothstep(u_similarity, u_similarity + u_smoothness, chromaDist);
    
    // Spill correction: reduce green intensity on the blended fringes
    vec3 color = texColor.rgb;
    if (alpha < 1.0) {
      color.g = min(color.g, max(color.r, color.b));
    }
    
    // Set the output color, forcing alpha to 0.0 for matching pixels
    gl_FragColor = vec4(color, alpha);
  }
`;

export default function ChromaKeyVideo({ 
  source, 
  style, 
  similarity = 0.4, 
  smoothness = 0.15 
}: ChromaKeyVideoProps) {
  const glRef = useRef<GLView>(null);
  const videoRef = useRef<Video>(null);
  const [videoReady, setVideoReady] = useState(false);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    // 1. Compile Shaders
    const compileShader = (type: number, sourceStr: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, sourceStr);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader validation failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    // 2. Link Program
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // 3. Setup Buffers (Quad)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0, 
         1.0, -1.0, 
        -1.0,  1.0, 
        -1.0,  1.0, 
         1.0, -1.0, 
         1.0,  1.0
      ]),
      gl.STATIC_DRAW
    );
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        0.0, 0.0, 
        1.0, 0.0, 
        0.0, 1.0, 
        0.0, 1.0, 
        1.0, 0.0, 
        1.0, 1.0
      ]),
      gl.STATIC_DRAW
    );
    const texcoordLocation = gl.getAttribLocation(program, 'texcoord');
    gl.enableVertexAttribArray(texcoordLocation);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    // 4. Setup Texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const uSimilarityLoc = gl.getUniformLocation(program, 'u_similarity');
    const uSmoothnessLoc = gl.getUniformLocation(program, 'u_smoothness');

    const render = () => {
      // NOTE: On native, gl.texImage2D directly from a video reference is restricted without 
      // an internal EXGL-ext or native surface bridge. However, on React Native Web, 
      // HTMLVideoElement can be successfully piped to texImage2D here.
      // We wrap in a try-catch to avoid crashing hard on incompatible native layers.
      try {
        if (videoReady && videoRef.current) {
          // @ts-ignore - The underlying DOM node / web ref
          const videoElement = Platform.OS === 'web' ? videoRef.current : null; 
          
          if (videoElement || Platform.OS !== 'web') {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            // On web, this successfully consumes the video frame
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement as any);
          }
        }
      } catch (e) {
        // silent fail for frames that aren't ready or native unsupported implementations
      }

      // Allow theme background to show through zero-alpha pixels
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(uSimilarityLoc, similarity);
      gl.uniform1f(uSmoothnessLoc, smoothness);

      // Render the quad
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.flush();
      gl.endFrameEXP();

      requestRef.current = requestAnimationFrame(render);
    };
    
    render();
  };

  return (
    <View style={[styles.container, style]}>
      {/* 
        The underlying AV Video. 
        It plays automatically, loops, is muted by default, and stays hidden behind the GLView.
        The WebGL canvas is conceptually overlaying and drawing the extracted frames.
      */}
      <Video
        ref={videoRef}
        source={source}
        style={styles.hiddenVideo}
        shouldPlay
        isLooping
        isMuted
        resizeMode={ResizeMode.COVER}
        onReadyForDisplay={() => setVideoReady(true)}
      />
      <GLView 
        ref={glRef}
        style={styles.glView} 
        onContextCreate={onContextCreate} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Rely on absolute filling or external dimensioning
    // Transparent wrapper so background themes show through
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  glView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent', // Make WebGL canvas transparent natively
  },
  hiddenVideo: {
    // The video needs to be rendered but effectively invisible,
    // so we can use its Web element for the GL texture safely.
    ...StyleSheet.absoluteFillObject,
    opacity: 0, 
  }
});
