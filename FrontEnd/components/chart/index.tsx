import * as React from 'react';
import * as classNames from 'classnames';

import './style.styl';

let echarts: any;

export interface IChartConfig {
  option: object;
  scale: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  position: {
    left: number;
    top: number;
  };
  imgSrc: string;
  id: number;
}

export interface IChartProps extends IChartConfig {
  key: number;
  index: number;
  isMask: boolean;
  onChartClick: (e: React.MouseEvent<HTMLElement>, id: number) => void;
}

export class Chart extends React.PureComponent<IChartProps, undefined> {
  constructor(props: IChartProps) {
    super(props);
    this.refreshChart = this.refreshChart.bind(this);
  }

  element: HTMLDivElement;
  chart: echarts.ECharts;

  refreshChart(nextProps: IChartProps) {
    this.chart.dispose();
    const { width, height } = nextProps.size;
    this.chart = echarts.init(this.element, '', { width, height });
    this.chart.setOption(nextProps.option);
  }

  async componentDidMount() {
    echarts = await import('echarts');
    const { width, height } = this.props.size;
    this.chart = echarts.init(this.element, '', { width, height });
    this.chart.setOption(this.props.option);
  }

  componentWillUnmount() {
    this.chart.dispose();
  }

  componentWillReceiveProps(nextProps: IChartProps) {
    const { width, height } = nextProps.size;
    if (height !== this.props.size.height || width !== this.props.size.width) {
      this.refreshChart(nextProps);
    }
  }

  render() {
    const { size, position, scale, index, isMask, onChartClick, id } = this.props;
    const cls = classNames('chart-container', {
      'chart-container-mask': isMask
    });
    const transform = `scale(${scale.x},${scale.y})`;
    return (
      <div
        onClick={(e) => onChartClick(e, id)}
        className={cls}
        style={{ ...size, ...position, position: 'absolute', transform, zIndex: index }} ref={(e) => this.element = e}>
      </div >
    );
  }
}