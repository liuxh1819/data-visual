import * as React from 'react';
import { Collapse } from 'antd';
// import { barList, pieList, lineList, scatterList } from '@charts';
import { DragableChartPreview } from '@container/draggable-chart-preview';
import { DragableSplit } from '@container/draggable-split';

import './style.styl';

const Panel = Collapse.Panel;

const panelStyle = {
  background: '#000',
  border: 0
};

// TODO: charts
export default class ComponentPanel extends React.PureComponent {
  render() {
    return (
      <div >
        <div className='component_collapse'>
          <Collapse bordered={false}>
            <Panel header='饼状图' key='1' style={panelStyle}>
            </Panel>
            <Panel header='柱状图' key='2' style={panelStyle}>
            </Panel>
            <Panel header='线状图' key='3' style={panelStyle}>
            </Panel>
            <Panel header='散点图' key='4' style={panelStyle}>
            </Panel>
            <Panel header='地图' key='5' style={panelStyle}>
            </Panel>
          </Collapse>
        </div>
        <div className='split'>
          <DragableSplit mode='vertical' />
          <DragableSplit mode='horizontal' />
        </div>
      </div>
    );
  }
}