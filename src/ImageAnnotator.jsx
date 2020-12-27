import React, { Component } from 'react';
import AnnotationLayer from './AnnotationLayer';
import { Editor } from '@recogito/recogito-client-core';

import './ImageAnnotator.scss';

export default class ImageAnnotator extends Component  {

  state = {
    selectedAnnotation: null,
    selectedDOMElement: null,
    modifiedTarget: null,
  }

  /** Shorthand **/
  clearState = () => this.setState({
    selectedAnnotation: null,
    selectedDOMElement: null,
    modifiedTarget: null
  });

  componentDidMount() {
    this.annotationLayer = new AnnotationLayer(this.props);

    this.annotationLayer.on('createSelection', this.handleCreateSelection);

    this.annotationLayer.on('select', this.handleSelect);

    this.annotationLayer.on('updateTarget', this.handleUpdateTarget);

    this.annotationLayer.on('mouseEnterAnnotation', this.handleMouseEnter);
    this.annotationLayer.on('mouseLeaveAnnotation', this.handleMouseLeave);
  }

  componentWillUnmount() {
    this.annotationLayer.destroy();
  }

  handleCreateSelection = selection =>
    this.props.onSelectionCreated(selection.clone());

  handleSelect = evt => {
    const { annotation, element, skipEvent } = evt;
    if (annotation) {
      this.setState({ 
        selectedAnnotation: annotation,
        selectedDOMElement: element
      });

      if (!annotation.isSelection && !skipEvent)
        this.props.onAnnotationSelected(annotation.clone());
    } else {
      this.clearState();
    }
  }

  handleUpdateTarget = (selectedDOMElement, modifiedTarget) => {
    this.setState({ selectedDOMElement, modifiedTarget });

    const clone = JSON.parse(JSON.stringify(modifiedTarget));
    this.props.onSelectionTargetChanged(clone);
  }

  handleMouseEnter = annotation =>
    this.props.onMouseEnterAnnotation(annotation.clone());

  handleMouseLeave = annotation =>
    this.props.onMouseLeaveAnnotation(annotation.clone());

  /**
   * A convenience method that allows the external application to
   * override the autogenerated Id for an annotation.
   */
  overrideAnnotationId = originalAnnotation => forcedId => {
    const { id } = originalAnnotation;

    // Force the editor to close first, otherwise there's a risk of orphaned annotation
    if (this.state.selectedAnnotation) {
      this.setState({
        selectedAnnotation: null,
        selectedDOMElement: null,
        modifiedTarget: null
      }, () => {
        this.annotationLayer.overrideId(id, forcedId);
      });
    } else {
      this.annotationLayer.overrideId(id, forcedId);
    }
  }

  /**************************/  
  /* Annotation CRUD events */
  /**************************/  

  /** Common handler for annotation CREATE or UPDATE **/
  onCreateOrUpdateAnnotation = method => (annotation, previous) => {
    // Merge updated target if necessary
    const a = (this.state.modifiedTarget) ?
      annotation.clone({ target: this.state.modifiedTarget }) : annotation.clone();

    // Call CREATE or UPDATE handler
    if (previous)
      this.props[method](a, previous.clone());
    else
      this.props[method](a, this.overrideAnnotationId(a));

    this.clearState();    
    this.annotationLayer.deselect();
    this.annotationLayer.addOrUpdateAnnotation(a, previous);
  }

  onDeleteAnnotation = annotation => {
    this.clearState();
    this.annotationLayer.removeAnnotation(annotation);
    this.props.onAnnotationDeleted(annotation);
  }

  /** Cancel button on annotation editor **/
  onCancelAnnotation = () => {
    this.clearState();
    this.annotationLayer.deselect();
  }

  /****************/               
  /* External API */
  /****************/    

  addAnnotation = annotation =>
    this.annotationLayer.addOrUpdateAnnotation(annotation.clone());

  getAnnotations = () =>
    this.annotationLayer.getAnnotations().map(a => a.clone());

  getSelected = () => {
    const selected = this.annotationLayer.getSelected();
    return selected ? selected.annotation.clone() : null;
  }

  getSelectedImageSnippet = () =>
    this.annotationLayer.getSelectedImageSnippet();

  removeAnnotation = annotation =>
    this.annotationLayer.removeAnnotation(annotation.clone());

  selectAnnotation = arg => {
    const annotation = this.annotationLayer.selectAnnotation(arg);
    
    if (annotation)
      return annotation.clone();
    else
      this.clearState(); // Deselect
  }
  
  setAnnotations = annotations =>
    this.annotationLayer.init(annotations.map(a => a.clone()));

  setDrawingTool = shape =>
    this.annotationLayer.setDrawingTool(shape);

  setVisible = visible =>
    this.annotationLayer.setVisible(visible);

  updateSelected = (annotation, applyImmediately) => {
    const a = annotation.isSelection ? annotation.toAnnotation() : annotation;

    if (applyImmediately) {
      if (this.state.selectedAnnotation)
        this.onCreateOrUpdateAnnotation('onAnnotationUpdated')(a, this.state.selectedAnnotation);
      else
        this.onCreateOrUpdateAnnotation('onAnnotationCreated')(a);
    } else {
      this.setState({ selectedAnnotation: a });
    }
  }
    
  render() {
    // The editor should open under normal conditions - annotation was selected, no headless mode
    const open = this.state.selectedAnnotation && !this.props.config.headless;

    const readOnly = this.props.config.readOnly || this.state.selectedAnnotation?.readOnly

    return (open && (
      <Editor
        wrapperEl={this.props.wrapperEl}
        annotation={this.state.selectedAnnotation}
        selectedElement={this.state.selectedDOMElement}
        readOnly={readOnly}
        config={this.props.config}
        env={this.props.env}
        onAnnotationCreated={this.onCreateOrUpdateAnnotation('onAnnotationCreated')}
        onAnnotationUpdated={this.onCreateOrUpdateAnnotation('onAnnotationUpdated')}
        onAnnotationDeleted={this.onDeleteAnnotation}
        onCancel={this.onCancelAnnotation} />
    ))
  }

}
