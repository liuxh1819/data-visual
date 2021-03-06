import * as React from 'react';
import { findDOMNode } from 'react-dom';
import {
  DragSource, DragSourceConnector,
  DragSourceMonitor, ConnectDragSource,
  DropTarget, DropTargetConnector,
  DropTargetMonitor, ConnectDropTarget
} from 'react-dnd';
import { LayerItem, IProps as ILayerItemProps } from '@components/layer-item';
import { LAYER_ITEM } from '@lib/dragtype';

interface IDraggableLayerItemProps extends ILayerItemProps {
  index: number;
  id: number;
  onClick: (e: React.MouseEvent<HTMLDivElement>, id: number) => void;
  onMouseEnter: (id: number) => void;
  onMouseLeave: () => void;
  moveDone: () => void;
  moveChart: (dragIndex: number, hoverIndex: number) => void;
  onCheckChange: (id: number, checked: boolean) => void;
}

interface IRawLayerItemProps extends IDraggableLayerItemProps {
  connectDropTarget: ConnectDropTarget;
  connectDragSource: ConnectDragSource;
  isDragging: boolean;
}

interface IBeginDragResult {
  index: number;
}

export class RawLayerItem extends React.Component<IRawLayerItemProps, undefined> {
  constructor(props: IRawLayerItemProps) {
    super(props);
    this.handleCheckChange = this.handleCheckChange.bind(this);
  }

  handleCheckChange(checked: boolean) {
    const { id, onCheckChange } = this.props;
    onCheckChange(id, checked);
  }

  render() {
    const { connectDragSource, connectDropTarget, imgSrc, checked, id,
      isDragging, onClick, onMouseEnter, onMouseLeave } = this.props;
    const opacity = isDragging ? 0 : 1;
    return connectDragSource(
      connectDropTarget(
        <div onMouseLeave={() => onMouseLeave()} onMouseEnter={() => onMouseEnter(id)} onClick={(e) => onClick(e, id)} >
          <LayerItem onCheckChange={this.handleCheckChange} checked={checked} style={{ opacity }} imgSrc={imgSrc} />
        </div>)
    );
  }
}

const dragSource = {
  beginDrag(props: IDraggableLayerItemProps, monitor: DragSourceMonitor, component: RawLayerItem) {
    return {
      index: props.index
    };
  },
  endDrag(props: IDraggableLayerItemProps) {
    props.moveDone();
  }
};

const dropTarget = {
  hover(props: IDraggableLayerItemProps, monitor: DropTargetMonitor, component: RawLayerItem) {
    let item = monitor.getItem() as IBeginDragResult;
    const dragIndex = item.index;
    const hoverIndex = props.index;

    if (dragIndex === hoverIndex) {
      return;
    }

    // Determine rectangle on screen
    const hoverBoundingRect = (findDOMNode(component) as Element).getBoundingClientRect();

    // Get vertical middle
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

    // Determine mouse position
    const clientOffset = monitor.getClientOffset();

    // Get pixels to the top
    const hoverClientY = clientOffset.y - hoverBoundingRect.top;

    // Only perform the move when the mouse has crossed half of the items height
    // When dragging downwards, only move when the cursor is below 50%
    // When dragging upwards, only move when the cursor is above 50%

    // Dragging downwards
    if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
      return;
    }

    // Dragging upwards
    if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
      return;
    }

    // Time to actually perform the action
    props.moveChart(dragIndex, hoverIndex);

    // Note: we're mutating the monitor item here!
    // Generally it's better to avoid mutations,
    // but it's good here for the sake of performance
    // to avoid expensive index searches.
    item.index = hoverIndex;
  }
};

function dragcollect(connect: DragSourceConnector, monitor: DragSourceMonitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  };
}

function dropCollect(connect: DropTargetConnector, monitor: DropTargetMonitor) {
  return {
    connectDropTarget: connect.dropTarget()
  };
}

const DragableChartPreview = DragSource<IDraggableLayerItemProps>(LAYER_ITEM, dragSource, dragcollect)(RawLayerItem);
export default DropTarget<IDraggableLayerItemProps>(LAYER_ITEM, dropTarget, dropCollect)(DragableChartPreview);