import Svg, { G, Path } from 'react-native-svg';

type WaLogoIconProps = {
  width: number;
  height: number;
};

export function WaLogoIcon({ width, height }: WaLogoIconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 40.0004 26.41" fill="none">
      <G>
        <Path
          d="M17.1808 26.41H11.2905L22.5972 0H28.4875L17.1808 26.41ZM40.0004 0H34.1101L22.8114 26.41H28.7017L40.0004 0Z"
          fill="white"
          fillOpacity={0.6}
        />
        <Path d="M5.88227 0H0L11.2987 26.41H17.181L5.88227 0Z" fill="white" />
        <Path d="M17.4057 0H11.5261L22.8248 26.41H28.7071L17.4057 0Z" fill="white" />
        <Path d="M28.477 0H22.5974L33.8961 26.41H39.7783L28.477 0Z" fill="white" />
      </G>
    </Svg>
  );
}
