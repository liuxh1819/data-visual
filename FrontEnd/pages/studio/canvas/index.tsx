import * as React from 'react';
import update from 'immutability-helper';
import { DropTarget, DropTargetConnector, DropTargetMonitor, ConnectDropTarget } from 'react-dnd';
import { PREVIEW_CHART, SPLIT } from '@lib/dragtype';
import { IChartOption, Controls, ChartType, ISeriesItemTemplate } from '@charts';
import { IBeginDragResult as IDraggableChartPreivewResult } from '@container/draggable-chart-preview';
import { IChartConfig, Chart } from '@components/chart';
import { TransformTool, SideType, ITransformConfig } from '@container/transform-tool';
import { MIN_SCALE_VALUE, MAX_SCALE_VALUE, IUpdateStudioState, NO_HIGHLIGHT_CHART, idMapIndexChart, IUpdateGlobalSetting, IUpdateGlobalState, NO_CHOOSED_SPLITID } from '@pages/studio';
import { IDraggableSplitResult } from '@container/draggable-split';
import SplitContainer from '@container/split-container';

import './style.styl';

export interface ICanvasProps {
  size: Base.Size;
  canvasScale: number;
  charts: ReadonlyArray<IChartConfig>;
  colors: string[];
  updateGlobalSetting: IUpdateGlobalSetting;
  updateGlobalState: IUpdateGlobalState;
  updateStudioState: IUpdateStudioState;
  splitContainer: 'none' | 'horizontal' | 'vertical';
  choosedChartIds: ReadonlyArray<number>;
  highlightChartId: number;
  choosedSplitId: number;
  isBorder: boolean;
}

type ITransformTools = {
  [p: string]: ITransformConfig;  // p is chartId
};

interface ICanvasState {
  transformTools: ITransformTools;
}

interface IRawCanvasProps extends ICanvasProps {
  connectDropTarget: ConnectDropTarget;
}

export const OFFSET_POSITION = {
  left: 10,
  top: 10
};

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 300;
export const CHART_MINI_SIZE = {
  width: 50,
  height: 50
};

export class RawCanvas extends React.Component<IRawCanvasProps, ICanvasState> {
  constructor(props: IRawCanvasProps) {
    super(props);
    this.chartClick = this.chartClick.bind(this);
    this.handleTransformMouseDown = this.handleTransformMouseDown.bind(this);
    this.handleCanvasMouseUp = this.handleCanvasMouseUp.bind(this);
    this.handleCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
    this.handleCanvasMouseDown = this.handleCanvasMouseDown.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleCopyClick = this.handleCopyClick.bind(this);
    this.handleTrashcanClick = this.handleTrashcanClick.bind(this);
    this.handleCanvasWheel = this.handleCanvasWheel.bind(this);
    this.getChartAfterMouseMove = this.getChartAfterMouseMove.bind(this);
    this.getChartConfigWhileMousemove = this.getChartConfigWhileMousemove.bind(this);
    this.unmountSplitContainer = this.unmountSplitContainer.bind(this);

    this.state = {
      transformTools: {} // depends on props.choosedChartIds
    };
  }

  canvasRef: React.RefObject<HTMLDivElement> = React.createRef();
  lastMousePosition: Base.Coordinate;
  sideType = SideType.None;

  appendChart(option: IChartOption, config: { seriesItemTemplate: ISeriesItemTemplate, controls: Controls, position: Base.Position, size: Base.Size, imgSrc: string, type: ChartType }, callback?: () => void) {
    const { position, size, imgSrc, controls, type, seriesItemTemplate } = config;
    const { updateStudioState, charts, colors } = this.props;
    const guid = Date.now();

    // from global color
    option.color = colors;

    const props: IChartConfig = {
      option, position, size, imgSrc,
      type, seriesItemTemplate, mode: 'absolute',
      id: guid, scale: { x: 1, y: 1 },
      colorFromGlobal: true, controls
    };
    updateStudioState({
      charts: update(charts, {
        $push: [props]
      })
    }, callback);
    return guid;
  }

  getPotionByCanvas(clientX: number, clientY: number) {
    let { left, top } = this.canvasRef.current.getBoundingClientRect();
    const { canvasScale } = this.props;
    left = (clientX - left) / canvasScale;
    top = (clientY - top) / canvasScale;
    return { left, top };
  }

  chartClick(e: React.MouseEvent<HTMLDivElement>, id: number) {
    const ids = this.props.choosedChartIds;
    if (e.shiftKey === true) {
      e.stopPropagation();
      return;
    }
    if (e.ctrlKey === true) {
      this.props.updateGlobalState({ choosedChartIds: [...ids, id] });
    } else {
      this.props.updateGlobalState({ choosedChartIds: [id] });
    }
  }

  handleTransformMouseDown(e: React.MouseEvent<HTMLDivElement>, type: SideType) {
    this.sideType = type;
    this.handleCanvasMouseDown(e);
  }

  handleCanvasMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    this.lastMousePosition = {
      x: e.clientX,
      y: e.clientY
    };
  }

  handleCanvasMouseUp() {
    if (this.sideType !== SideType.None) {
      const newCharts = this.mergeNewCharts(this.getChartAfterMouseMove);
      this.props.updateStudioState({ charts: newCharts });
    }
    this.sideType = SideType.None;
  }

  getChartAfterMouseMove(id: number) {
    const index = idMapIndexChart.get(id);
    const charts = this.props.charts;
    const transformTool = this.state.transformTools[id];
    const chart = charts[index];
    const size = {
      width: chart.scale.x * chart.size.width,
      height: chart.scale.y * chart.size.height
    };

    return update(charts[index], {
      size: { $merge: size },
      position: { $merge: transformTool.position },
      scale: {
        $set: { x: 1, y: 1 }
      }
    });
  }

  handleCanvasWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const { canvasScale, updateGlobalSetting } = this.props;
    if (e.deltaY > 0) {
      canvasScale >= MIN_SCALE_VALUE && updateGlobalSetting({ canvasScale: canvasScale - 0.05 });
    } else {
      canvasScale <= MAX_SCALE_VALUE && updateGlobalSetting({ canvasScale: canvasScale + 0.05 });
    }
  }

  handleCanvasMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (this.sideType === SideType.None)
      return;

    const ps = { x: e.clientX, y: e.clientY };
    const newCharts = this.mergeNewCharts(this.getChartConfigWhileMousemove, ps);
    this.props.updateStudioState({ charts: newCharts });

    this.lastMousePosition = {
      x: e.clientX,
      y: e.clientY
    };
  }

  mergeNewCharts<T>(func: (chartId: number, ...rest: T[]) => IChartConfig, ...rest: T[]) {
    let newCharts: IChartConfig[] = [];
    const { charts, choosedChartIds } = this.props;
    for (let i = 0, length = charts.length; i < length; i++) {
      const id = charts[i].id;
      let chart = charts[i];
      if (choosedChartIds.includes(id)) {
        chart = func(id, ...rest);
      }
      newCharts.push(chart);
    }
    return newCharts;
  }

  getChartConfigWhileMousemove(chartId: number, postion: Base.Coordinate) {
    const { charts, canvasScale } = this.props;
    const { transformTools } = this.state;
    const transformTool = transformTools[chartId];

    const delta = {
      x: (postion.x - this.lastMousePosition.x) / canvasScale,
      y: (postion.y - this.lastMousePosition.y) / canvasScale
    };

    const chartIndex = idMapIndexChart.get(chartId);
    const chart = this.props.charts[chartIndex];

    let size = { ...transformTool.size };
    let position = { ...transformTool.position };

    if (this.sideType === SideType.Right) {
      size.width = size.width + delta.x;
    }
    if (this.sideType === SideType.Bottom) {
      size.height = size.height + delta.y;
    }
    if (this.sideType === SideType.Top) {
      size.height = size.height - delta.y;
      position.top = position.top + delta.y;
    }
    if (this.sideType === SideType.Left) {
      size.width = size.width - delta.x;
      position.left = position.left + delta.x;
    }
    if (this.sideType === SideType.RightTop) {
      size.width = size.width + delta.x;
      size.height = size.height - delta.y;
      position.top = position.top + delta.y;
    }

    if (this.sideType === SideType.LeftTop) {
      size.width = size.width - delta.x;
      size.height = size.height - delta.y;
      position.top = position.top + delta.y;
      position.left = position.left + delta.x;
    }

    if (this.sideType === SideType.LeftBottom) {
      size.width = size.width - delta.x;
      size.height = size.height + delta.y;
      position.left = position.left + delta.x;
    }

    if (this.sideType === SideType.RightBottom) {
      size.width = size.width + delta.x;
      size.height = size.height + delta.y;
    }
    if (this.sideType === SideType.Middle) {
      position.left = position.left + delta.x;
      position.top = position.top + delta.y;
    }

    const chartScale = {
      x: size.width / chart.size.width,
      y: size.height / chart.size.height
    };
    const chartPosition = {
      left: position.left + chart.size.width * (chartScale.x - 1) / 2,
      top: position.top + chart.size.height * (chartScale.y - 1) / 2
    };

    if (size.width < CHART_MINI_SIZE.width || size.height < CHART_MINI_SIZE.height) {
      return charts[chartIndex];
    }

    return update(charts[chartIndex], {
      position: { $merge: chartPosition },
      scale: { $set: chartScale }
    });
  }

  handleCopyClick(id: number) {
    const { charts } = this.props;
    const index = idMapIndexChart.get(id);
    const { option, position: { left, top }, size, imgSrc, controls, type, seriesItemTemplate } = charts[index];
    const position = {
      left: left + OFFSET_POSITION.left,
      top: top + OFFSET_POSITION.top
    };
    const newChartId = this.appendChart(option, { seriesItemTemplate, controls, position, size, imgSrc, type });
    this.props.updateGlobalState({ choosedChartIds: [newChartId] });
  }

  handleTrashcanClick(id: number) {
    const { charts, updateStudioState, updateGlobalState } = this.props;
    const index = idMapIndexChart.get(id);

    updateGlobalState({
      choosedChartIds: []
    });

    updateStudioState({
      charts: update(charts, {
        $splice: [[index, 1]]
      })
    });
  }

  renderTransformTools() {
    const transformTools = this.state.transformTools;
    return Object.keys(transformTools).map((key) => {
      const { position, size } = transformTools[key];
      return (
        <TransformTool
          position={position} size={size} key={key} id={parseInt(key)}
          handleTransformMouseDown={this.handleTransformMouseDown}
          onCopyClick={this.handleCopyClick}
          onTrashcanClick={this.handleTrashcanClick}>
        </TransformTool>);
    });
  }

  renderCharts() {
    const { charts, highlightChartId } = this.props;
    return charts.map((chart, idx) => {
      const { id } = chart;  // key must be chartId

      const isMask = highlightChartId !== NO_HIGHLIGHT_CHART && highlightChartId === id;

      return (
        <Chart  {...chart} onChartClick={this.chartClick} id={id} key={id} isMask={isMask} index={idx} >
        </Chart>
      );
    });
  }

  handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
  }

  setTransformToolsState(charts: ReadonlyArray<IChartConfig>, choosedChartIds: ReadonlyArray<number>) {
    let newTransformTools: ITransformTools = {};
    for (const chart of charts) {
      if (!choosedChartIds.includes(chart.id) || chart.mode === 'responsive') {
        continue;
      }

      const {
        position: { left, top },
        size: { width, height }, id,
        scale: { x: scaleX, y: scaleY }
      } = chart;

      const toolSize = {
        width: scaleX * width,
        height: scaleY * height
      };

      const toolPosition = {
        left: left - width * (scaleX - 1) / 2,
        top: top - height * (scaleY - 1) / 2
      };

      newTransformTools[id] = { position: toolPosition, size: toolSize, id };
    }
    this.setState({
      transformTools: newTransformTools
    });
  }

  unmountSplitContainer() {
    this.props.updateGlobalState({ splitContainer: 'none', choosedSplitId: NO_CHOOSED_SPLITID });
  }

  static getDerivedStateFromProps(nextProps: ICanvasProps) {
    const { charts, choosedChartIds } = nextProps;
    let newTransformTools: ITransformTools = {};
    for (const chart of charts) {
      if (!choosedChartIds.includes(chart.id) || chart.mode === 'responsive') {
        continue;
      }

      const {
        position: { left, top },
        size: { width, height }, id,
        scale: { x: scaleX, y: scaleY }
      } = chart;

      const toolSize = {
        width: scaleX * width,
        height: scaleY * height
      };

      const toolPosition = {
        left: left - width * (scaleX - 1) / 2,
        top: top - height * (scaleY - 1) / 2
      };
      newTransformTools[id] = { position: toolPosition, size: toolSize, id };
    }
    return { transformTools: newTransformTools };
  }


  render() {
    const { size: { width, height }, canvasScale, connectDropTarget, updateStudioState, updateGlobalState,
      charts, highlightChartId, choosedChartIds, choosedSplitId, isBorder, splitContainer } = this.props;

    return connectDropTarget(
      <div className='canvas_container' style={{ width, height, transform: `scale(${canvasScale})` }}
        onMouseDown={(e) => this.handleCanvasMouseDown(e)}
        onMouseMove={(e) => this.handleCanvasMouseMove(e)}
        onWheel={(e) => this.handleCanvasWheel(e)}
        onClick={(e) => this.handleClick(e)}
        onMouseUp={this.handleCanvasMouseUp}>
        <div className='canvas' ref={this.canvasRef}>
          {
            splitContainer !== 'none'
            && <SplitContainer isBorder={isBorder} choosedSplitId={choosedSplitId} containerId={0}
              unmount={this.unmountSplitContainer} choosedChartIds={choosedChartIds} canvasScale={canvasScale}
              highlightChartId={highlightChartId} charts={charts} updateGlobalState={updateGlobalState} mode={splitContainer} />
          }
          {
            splitContainer === 'none'
            && this.renderCharts()
          }
          {
            splitContainer === 'none'
            && this.renderTransformTools()
          }
        </div>
      </div>
    );
  }
}

const boxTarget = {
  drop(props: ICanvasProps, monitor: DropTargetMonitor, component: RawCanvas) {
    if (monitor.getItemType() === PREVIEW_CHART) {
      if (props.splitContainer !== 'none') return;

      const item = monitor.getItem() as IDraggableChartPreivewResult;

      const { x, y } = monitor.getClientOffset();
      let { left, top } = component.getPotionByCanvas(x, y);
      const position = {
        left: left - DEFAULT_WIDTH / 2,
        top: top - DEFAULT_HEIGHT / 2
      };
      const size = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
      const { imgSrc, controls, type, seriesItemTemplate, option } = item;

      component.appendChart(option, { seriesItemTemplate, controls, position, size, imgSrc, type });
      return;
    }

    if (monitor.getItemType() === SPLIT) {
      if (monitor.didDrop()) return;

      if (props.charts.length > 0) {
        alert('请先删除自由布局图表');
        return;
      }

      const item = monitor.getItem() as IDraggableSplitResult;
      props.updateGlobalState({
        splitContainer: item.mode
      });
      return;
    }
  }
};

function collect(connect: DropTargetConnector, monitor: DropTargetMonitor) {
  return {
    connectDropTarget: connect.dropTarget()
  };
}

export const Canvas = DropTarget<ICanvasProps>([PREVIEW_CHART, SPLIT], boxTarget, collect)(RawCanvas);