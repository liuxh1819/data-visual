import * as React from 'react';
import Sidebar from '@base/sidebar';
import GlobalSetting from '@pages/studio/global-setting';
// import ComSetting from '@pages/studio/com-setting';
import { Context as StudioContext } from '@pages/studio';

import './style.styl';

interface IProps {
  updateCanvasPos: () => void;
}

// TODO: ComSetting
export default function Settings({ updateCanvasPos }: IProps) {
  return (
    <Sidebar onOpenChangeAfter={() => updateCanvasPos()} className='setting' mode='right' width='330px' height='100%'>
      <Sidebar.Panel title='全局设置'>
        <GlobalSetting />
      </Sidebar.Panel>
      <Sidebar.Panel title='组件设置'>
        {/* <ComSetting /> */}
      </Sidebar.Panel>
    </Sidebar>
  );
}