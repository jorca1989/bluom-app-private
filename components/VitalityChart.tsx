import React, { useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface DataPoint {
    date: string;
    drive?: number; // Made optional to match schema
    recovery?: number; // Made optional to match schema
    focus?: number;
}

interface VitalityChartProps {
    data: DataPoint[];
    height?: number;
    width?: number;
}

export const VitalityChart = ({ data, height = 200, width = SCREEN_WIDTH - 40 }: VitalityChartProps) => {
    const chartHeight = height;
    const chartWidth = width;
    const padding = 20;

    // Scales
    const xScale = (index: number) => {
        return padding + (index * (chartWidth - 2 * padding)) / (Math.max(1, data.length - 1));
    };

    const yScale = (value: number) => {
        // Value 0-10 mapped to height-padding to padding
        // 0 -> height - padding
        // 10 -> padding
        return chartHeight - padding - (value / 10) * (chartHeight - 2 * padding);
    };

    const drivePath = useMemo(() => {
        if (data.length === 0) return '';
        return data.reduce((acc, point, i) => {
            const x = xScale(i);
            const y = yScale(point.drive || 5); // Default to 5 if missing
            return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
        }, '');
    }, [data]);

    const recoveryPath = useMemo(() => {
        if (data.length === 0) return '';
        return data.reduce((acc, point, i) => {
            const x = xScale(i);
            const y = yScale(point.recovery || 5); // Default to 5 if missing
            return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
        }, '');
    }, [data]);

    return (
        <View className="items-center justify-center bg-slate-900 rounded-3xl p-4 shadow-lg border border-slate-800">
            <Svg width={chartWidth} height={chartHeight}>
                <Defs>
                    <LinearGradient id="driveGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#3b82f6" stopOpacity="0.5" />
                        <Stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
                    </LinearGradient>
                    <LinearGradient id="recoveryGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#10b981" stopOpacity="0.5" />
                        <Stop offset="1" stopColor="#10b981" stopOpacity="0" />
                    </LinearGradient>
                </Defs>

                {/* Grid Lines */}
                {[2, 4, 6, 8, 10].map((val) => (
                    <Line
                        key={val}
                        x1={padding}
                        y1={yScale(val)}
                        x2={chartWidth - padding}
                        y2={yScale(val)}
                        stroke="#1e293b"
                        strokeWidth="1"
                    />
                ))}

                {/* Drive Path (Blue) */}
                <Path
                    d={drivePath}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    fill="none"
                />
                {data.map((point, i) => (
                    <Circle
                        key={`d-${i}`}
                        cx={xScale(i)}
                        cy={yScale(point.drive || 5)}
                        r="4"
                        fill="#3b82f6"
                        stroke="#0f172a"
                        strokeWidth="2"
                    />
                ))}

                {/* Recovery Path (Green) */}
                <Path
                    d={recoveryPath}
                    stroke="#10b981"
                    strokeWidth="3"
                    fill="none"
                />
                {data.map((point, i) => (
                    <Circle
                        key={`r-${i}`}
                        cx={xScale(i)}
                        cy={yScale(point.recovery || 5)}
                        r="4"
                        fill="#10b981"
                        stroke="#0f172a"
                        strokeWidth="2"
                    />
                ))}

                {/* Axis Texts could go here but skipping for clean minimalist look */}
            </Svg>
        </View>
    );
};
