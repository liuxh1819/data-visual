import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import update from 'immutability-helper';
import Slider from '@base/slider';
import Leftbar from '@pages/studio/leftbar';
import { Canvas, OFFSET_POSITION } from '@pages/studio/canvas';
import Setting from '@pages/studio/setting';
import Banner from '@pages/studio/banner';
import { IChartConfig } from '@components/chart';
import './style.styl';

export type CanvasPos = {
  paddingLeft: string,
  paddingTop: string
};


export type Charts = ReadonlyArray<IChartConfig>;

export type ZoomType = 'width' | 'height' | 'full';

export interface IStudioState {
  globalSettings: IGlobalSettings;
  globalState: IGlobalState;
  charts: Charts;
}

export interface IUpdateStudioState {
  (state: Partial<IStudioState>, callback?: () => void): void;
}

export interface IUpdateGlobalSetting {
  ({ ...globalSettings }: Partial<IGlobalSettings>): void;
}

export interface IUpdateGlobalState {
  ({ ...globalState }: Partial<IGlobalState>): void;
}

interface IContextValue {
  globalSettings: IGlobalSettings;
  updateGlobalSetting: IUpdateGlobalSetting;
  globalState: IGlobalState;
  updateGlobalState: IUpdateGlobalState;
}

interface IGlobalState {
  splitContainer: 'none' | 'horizontal' | 'vertical';
  choosedChartIds: ReadonlyArray<number>;
  choosedSplitId: number;
  highlightChartId: number;
}

interface IGlobalSettings {
  canvasSize: Base.Size;
  canvasScale: number;
  isBorder: boolean;
  colors: string[];
  zoomType: ZoomType;
}

// const
export const NO_HIGHLIGHT_CHART = -1;
export const NO_CHOOSED_SPLITID = -1;
export const MIN_SCALE_VALUE = 0.01;
export const MAX_SCALE_VALUE = 10;

// default context's value

const DEFAULT_CONTEXT: IContextValue = {
  globalSettings: {
    canvasSize: { width: 800, height: 600 },
    canvasScale: 1,
    isBorder: true,
    colors: ['#c23531', '#2f4554', '#61a0a8', '#d48265', '#91c7ae', '#749f83', '#ca8622', '#bda29a'],
    zoomType: 'width'
  },
  globalState: {
    splitContainer: 'none',
    choosedChartIds: [],
    choosedSplitId: NO_CHOOSED_SPLITID,
    highlightChartId: NO_HIGHLIGHT_CHART
  },
  updateGlobalSetting: () => { },
  updateGlobalState: () => { }
};

export const Context: React.Context<IContextValue> = React.createContext(DEFAULT_CONTEXT);

// chart'id map charts's index
export const idMapIndexChart: Map<number, number> = new Map();

// important: must use updateStudioState method to change state !!!
class RawStudio extends React.Component<undefined, IStudioState> {
  constructor() {
    super(undefined);
    this.updateCanvasPos = this.updateCanvasPos.bind(this);
    this.updateStudioState = this.updateStudioState.bind(this);
    this.updateGlobalSetting = this.updateGlobalSetting.bind(this);
    this.updateGlobalState = this.updateGlobalState.bind(this);
    this.handleContentClick = this.handleContentClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.deleteChoosedChart = this.deleteChoosedChart.bind(this);
    this.copyChoosedChart = this.copyChoosedChart.bind(this);
    this.toChartsClipboard = this.toChartsClipboard.bind(this);
    this.handleSliderChange = this.handleSliderChange.bind(this);
    this.handleSliderPlusClick = this.handleSliderPlusClick.bind(this);
    this.handleSliderMinusClick = this.handleSliderMinusClick.bind(this);

    this.state = {
      globalSettings: DEFAULT_CONTEXT.globalSettings,
      globalState: DEFAULT_CONTEXT.globalState,
      charts: []
    };
  }

  private contentRef: React.RefObject<HTMLDivElement> = React.createRef();

  // Note: id maybe repeated in chartsClipboard,
  // so it will be re-assigned when copy
  private chartsClipboard: IChartConfig[] = [];

  updateCanvasPos() {
    const { width, height } = document.defaultView.getComputedStyle(this.contentRef.current, null);
    const { canvasSize, canvasScale } = this.state.globalSettings;
    let canvasWidth = canvasSize.width * canvasScale,
      canvasHeight = canvasSize.height * canvasScale,
      paddingLeft = (parseFloat(width) - canvasWidth) / 2 + 'px',
      paddingTop = (parseFloat(height) - canvasHeight) / 2 + 'px';
    paddingLeft = parseFloat(paddingLeft) < 0 ? '50px' : paddingLeft;
    paddingTop = parseFloat(paddingTop) < 0 ? '50px' : paddingTop;
    this.contentRef.current.style.paddingLeft = paddingLeft;
    this.contentRef.current.style.paddingTop = paddingTop;
  }

  updateStudioState: IUpdateStudioState = (state: IStudioState, callback?: () => void) => {
    // re-build map
    if (state.charts) {
      idMapIndexChart.clear();
      state.charts.forEach((chart, idx) => {
        idMapIndexChart.set(chart.id, idx);
      });
    }
    this.setState({ ...state }, () => { typeof callback === 'function' && callback(); });
  }

  updateGlobalSetting(globalSetting: Partial<IGlobalSettings>) {
    this.setState({
      globalSettings: update(this.state.globalSettings, {
        $merge: globalSetting
      })
    });
  }

  updateGlobalState(globalState: Partial<IGlobalState>) {
    this.setState({
      globalState: update(this.state.globalState, {
        $merge: globalState
      })
    });
  }

  handleContentClick() {
    this.updateGlobalState({
      choosedChartIds: [],
      choosedSplitId: NO_CHOOSED_SPLITID,
      highlightChartId: NO_HIGHLIGHT_CHART
    });
  }

  handleSliderChange(value: number) {
    this.updateGlobalSetting({ canvasScale: value });
  }

  handleSliderPlusClick() {
    let canvasScale = this.state.globalSettings.canvasScale;
    this.updateGlobalSetting({ canvasScale: canvasScale + 0.3 });
  }

  handleSliderMinusClick() {
    let canvasScale = this.state.globalSettings.canvasScale;
    this.updateGlobalSetting({ canvasScale: canvasScale - 0.3 });
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.target !== document.body) {
      return;
    }
    let key = e.key.toLocaleLowerCase();
    if (key === 'delete') {
      this.deleteChoosedChart();
    }
    if (this.state.globalState.splitContainer === 'none') {
      if (e.ctrlKey && key === 'c') {
        this.toChartsClipboard();
      }
      if (e.ctrlKey && key === 'v') {
        this.copyChoosedChart();
      }
    }
  }

  toChartsClipboard() {
    const { globalState: { choosedChartIds }, charts } = this.state;
    if (choosedChartIds.length === 0)
      return;

    this.chartsClipboard = [];

    charts.forEach((chart, idx) => {
      if (choosedChartIds.includes(chart.id)) {
        let chartConfig: IChartConfig;
        const { position: { left, top }, option, ...props } = chart;
        const position = {
          left: left + OFFSET_POSITION.left,
          top: top + OFFSET_POSITION.top
        };
        chartConfig = { option, position, ...props };
        this.chartsClipboard.push(chartConfig);
      }
    });
  }

  copyChoosedChart() {
    // reassign id
    let chartsClipboardCopyed: IChartConfig[] = [];
    for (let i = 0, length = this.chartsClipboard.length; i < length; i++) {
      chartsClipboardCopyed.push(Object.assign({}, this.chartsClipboard[i]));
      chartsClipboardCopyed[i].id = Date.now() + 1525010857275 + i;
    }

    this.updateGlobalState({
      choosedChartIds: (() => {
        return chartsClipboardCopyed.map(({ id }) => {
          return id;
        });
      })()
    });

    this.updateStudioState({
      charts: update(this.state.charts, {
        $push: chartsClipboardCopyed
      })
    });
  }

  deleteChoosedChart() {
    const { charts, globalState: { choosedChartIds } } = this.state;
    if (choosedChartIds.length === 0)
      return;
    let newCharts: IChartConfig[] = [];
    charts.forEach((chart, idx) => {
      !choosedChartIds.includes(chart.id) && newCharts.push(chart);
    });
    this.updateStudioState({ charts: newCharts });
    this.updateGlobalState({ choosedChartIds: [] });
  }

  componentDidMount() {
    window.addEventListener('resize', this.updateCanvasPos);
    window.addEventListener('keydown', this.onKeyDown);
    this.updateCanvasPos();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateCanvasPos);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  componentDidUpdate() {
    this.updateCanvasPos();
  }

  render() {
    const { globalState, globalSettings, charts } = this.state;
    const { isBorder, zoomType, canvasSize, canvasScale, colors } = globalSettings;
    const { splitContainer, choosedChartIds, highlightChartId, choosedSplitId } = globalState;
    return (
      <Context.Provider value={{
        globalSettings: globalSettings,
        updateGlobalSetting: this.updateGlobalSetting,
        globalState: globalState,
        updateGlobalState: this.updateGlobalState
      }}>
        <Banner isBorder={isBorder} zoomType={zoomType} charts={charts} canvasSize={canvasSize} />
        <div className='studio'>
          <div className='leftbar_container'>
            <Leftbar updateCanvasPos={this.updateCanvasPos} />
          </div>
          <div className='st_content' onClick={this.handleContentClick}>
            <div ref={this.contentRef} className='canvas_wrapper'>
              <Canvas
                canvasScale={canvasScale} size={canvasSize} highlightChartId={highlightChartId} updateGlobalSetting={this.updateGlobalSetting}
                charts={charts} updateStudioState={this.updateStudioState} choosedSplitId={choosedSplitId} updateGlobalState={this.updateGlobalState}
                choosedChartIds={choosedChartIds} colors={colors} isBorder={isBorder} splitContainer={splitContainer}>
              </Canvas>
            </div>
            <div className='scroll-wrapper' >
              <div className='scroll-postion'>
                <Slider step={0.01} width={200} maxValue={MAX_SCALE_VALUE} minValue={MIN_SCALE_VALUE}
                  value={canvasScale} onChange={this.handleSliderChange}
                  onMinusClick={this.handleSliderMinusClick} onPlusClick={this.handleSliderPlusClick} >
                </Slider>
              </div>
            </div>
          </div>
          <div className='setting_container'>
            <Setting updateCanvasPos={this.updateCanvasPos} />
          </div>
        </div>
      </Context.Provider>
    );
  }
}

export const Studio = DragDropContext(HTML5Backend)(RawStudio);