import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type BookFillIconProps = {
  size: number;
};

const VIEWBOX_WIDTH = 150.67;
const VIEWBOX_HEIGHT = 128.301;

export function BookFillIcon({ size }: BookFillIconProps) {
  const height = size * (VIEWBOX_HEIGHT / VIEWBOX_WIDTH);

  return (
    <Svg width={size} height={height} viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} fill="none">
      <Path
        d="M41.5804 117.554C53.3358 117.554 61.4638 121.786 65.0912 124.271C66.3675 124.943 69.7261 127.025 70.5994 127.227V15.5843C65.5614 6.8517 51.7908 0 37.7515 0C19.1445 0 3.96324 10.4791 0 18.4056V119.905C0.0671735 125.883 3.42585 128.301 7.59061 128.301C10.6806 128.301 12.6286 127.227 14.711 125.615C19.0101 122.122 28.8846 117.554 41.5804 117.554ZM109.157 117.554C121.853 117.554 131.66 122.122 135.959 125.615C138.042 127.227 139.99 128.301 143.012 128.301C147.177 128.301 150.67 125.883 150.67 119.905V18.4056C146.707 10.4791 131.526 0 112.986 0C98.9466 0 85.1089 6.8517 80.138 15.5843V127.361C80.9441 127.16 84.3028 125.01 85.6463 124.271C89.2736 121.786 97.4016 117.554 109.157 117.554Z"
        fill="url(#bookFillGradient)"
      />
      <Defs>
        <LinearGradient
          id="bookFillGradient"
          x1="75.3351"
          y1="0.188324"
          x2="75.3351"
          y2="128.301"
          gradientUnits="userSpaceOnUse">
          <Stop stopColor="#EEF0FF" stopOpacity={0.1} />
          <Stop offset={1} stopColor="white" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}
