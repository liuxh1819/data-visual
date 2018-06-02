import * as React from 'react';
import Sidebar from '@base/sidebar';
// import Layer from '@pages/studio/layer';
import ComponentPanel from '@pages/studio/component-panel';
import { Context as StudioContext } from '@pages/studio';

import './style.styl';

interface IProps {
  updateCanvasPos: () => void;
}

// TODO: Layer
export default function LeftBar({ updateCanvasPos }: IProps) {
  return (
    <Sidebar onOpenChangeAfter={() => updateCanvasPos()} className='leftbar' mode='left' width='200px' height='100%'>
      <Sidebar.Panel className='component_panel' title='组件'>
        <ComponentPanel />
      </Sidebar.Panel>
      <Sidebar.Panel className='layer_panel' title='图层'>
        {/* <Layer choosedChartIds={choosedChartIds} updateStudioState={updateStudioState} charts={charts} /> */}
      </Sidebar.Panel>
    </Sidebar>
  );
}