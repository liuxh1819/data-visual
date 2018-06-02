import * as React from 'react';
import DoubleInput from '@components/double-input';
import { IupdateGlobalSetting } from '@pages/studio';

const Input = DoubleInput.Input;

interface IProps {
  canvasSize: Base.Size;
  updateGlobalSetting: IupdateGlobalSetting;
}

export default class CanvasSize extends React.Component<IProps, undefined> {
  constructor(props: IProps) {
    super(props);
    this.handleWidthChange = this.handleWidthChange.bind(this);
    this.handleHeightChange = this.handleHeightChange.bind(this);
  }

  shouldComponentUpdate(nextProps: IProps) {
    const { canvasSize: { width, height } } = nextProps;
    const { canvasSize: { width: lastWidth, height: lastHeight } } = this.props;
    return width !== lastWidth || height !== lastHeight;
  }

  handleWidthChange(width: number) {
    this.props.updateGlobalSetting({
      canvasSize: {
        width,
        height: this.props.canvasSize.height
      }
    });
  }

  handleHeightChange(height: number) {
    this.props.updateGlobalSetting({
      canvasSize: {
        width: this.props.canvasSize.width,
        height
      }
    });
  }

  render() {
    const { canvasSize: { width, height } } = this.props;
    return (
      <DoubleInput>
        <Input name='宽度' value={width} onChange={this.handleWidthChange} />
        <Input name='高度' value={height} onChange={this.handleHeightChange} />
      </DoubleInput>
    );
  }
}