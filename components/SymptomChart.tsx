import React, { useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface DataPoint {
    date: string;
    mood?: number; // 1-10
    energy?: number; // 1-10
}

interface SymptomChartProps {
    data: DataPoint[];
    height?: number;
    width?: number;
}

export const SymptomChart = ({ data, height = 200, width = SCREEN_WIDTH - 40 }: SymptomChartProps) => {
    const chartHeight = height;
    const chartWidth = width;
    const padding = 20;

    // Scales
    const xScale = (index: number) => {
        return padding + (index * (chartWidth - 2 * padding)) / (Math.max(1, data.length - 1));
    };

    const yScale = (value: number) => {
        return chartHeight - padding - (value / 10) * (chartHeight - 2 * padding);
    };

    const moodPath = useMemo(() => {
        if (data.length === 0) return '';
        return data.reduce((acc, point, i) => {
            const x = xScale(i);
            const y = yScale(point.mood || 5);
            return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
        }, '');
    }, [data]);

    const energyPath = useMemo(() => {
        if (data.length === 0) return '';
        return data.reduce((acc, point, i) => {
            const x = xScale(i);
            const y = yScale(point.energy || 5);
            return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
        }, '');
    }, [data]);

    return (
        <View className="items-center justify-center bg-white rounded-3xl p-4 shadow-sm border border-rose-100">
            <Svg width={chartWidth} height={chartHeight}>
                <Defs>
                    <LinearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#a855f7" stopOpacity="0.5" />
                        <Stop offset="1" stopColor="#a855f7" stopOpacity="0" />
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
                        stroke="#f1f5f9"
                        strokeWidth="1"
                    />
                ))}

                {/* Mood Path (Purple) */}
                <Path
                    d={moodPath}
                    stroke="#a855f7"
                    strokeWidth="3"
                    fill="none"
                />
                {data.map((point, i) => (
                    <Circle
                        key={`m-${i}`}
                        cx={xScale(i)}
                        cy={yScale(point.mood || 5)}
                        r="4"
                        fill="#a855f7"
                        stroke="#fff"
                        strokeWidth="2"
                    />
                ))}

                {/* Energy Path (Yellow/Amber) */}
                <Path
                    d={energyPath}
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeDasharray="5, 5" // Dashed for secondary metric
                    fill="none"
                />
                {data.map((point, i) => (
                    <Circle
                        key={`e-${i}`}
                        cx={xScale(i)}
                        cy={yScale(point.energy || 5)}
                        r="3"
                        fill="#f59e0b"
                        stroke="#fff"
                        strokeWidth="1"
                    />
                ))}
            </Svg>
        </View>
    );
};
