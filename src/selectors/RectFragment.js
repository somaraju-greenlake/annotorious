import { SVG_NAMESPACE } from '../util/SVG';

/** 
 * Parses a W3C Web Annotation FragmentSelector conforming
 * to the Media Fragments spec. Supports (well-formed) xywh=pixel
 * and xywh=percent fragments. 
 */
export const parseRectFragment = (annotation, image) => {
  const selector = annotation.selector('FragmentSelector');

  if (selector?.conformsTo.startsWith('http://www.w3.org/TR/media-frags')) {
    const { value } = selector;
  
    const format = value.includes(':') ? value.substring(value.indexOf('=') + 1, value.indexOf(':')) : 'pixel';
    const coords = value.includes(':') ? value.substring(value.indexOf(':') + 1) : value.substring(value.indexOf('=') + 1);

    let [ x, y, w, h ] = coords.split(',').map(parseFloat);

    if (format.toLowerCase() === 'percent') {
      x = x * image.naturalWidth  / 100;
      y = y * image.naturalHeight / 100;
      w = w * image.naturalWidth  / 100;
      h = h * image.naturalHeight / 100;
    }

    return { x, y, w, h };
  }
}

/** 
 * Serializes a (x, y, w, h)-tuple as Media Fragment selector
 * using pixel coordinates.
 */
const toPixelRectFragment = (x, y, w, h, image) => ({
  source: image?.src,
  selector: {
    type: "FragmentSelector",
    conformsTo: "http://www.w3.org/TR/media-frags/",
    value: `xywh=pixel:${x},${y},${w},${h}`
  }
});

/** 
 * Serializes a (x, y, w, h)-tuple as Media Fragment selector 
 * using percent coordinates.
 */
const toPercentRectFragment = (x, y, w, h, image) => {
  const px = x / image.naturalWidth  * 100;
  const py = y / image.naturalHeight * 100;
  const pw = w / image.naturalWidth  * 100;
  const ph = h / image.naturalHeight * 100;

  return {
    source: image.src,
    selector: {
      type: "FragmentSelector",
      conformsTo: "http://www.w3.org/TR/media-frags/",
      value: `xywh=percent:${px},${py},${pw},${ph}`
    }
  }
}

export const toRectFragment = (x, y, w, h, image, fragmentUnit) =>
  fragmentUnit?.toLowerCase() === 'percent' ?
    toPercentRectFragment(x, y, w, h, image) :
    toPixelRectFragment(x, y, w, h, image);

/** Shorthand to apply the given (x, y, w, h) to the SVG shape **/
const setXYWH = (shape, x, y, w, h) => {
  shape.setAttribute('x', x);
  shape.setAttribute('y', y);
  shape.setAttribute('width', w);
  shape.setAttribute('height', h);
}

export const drawRectMask = (imageDimensions, x, y, w, h) => {
  const mask = document.createElementNS(SVG_NAMESPACE, 'path');
  mask.setAttribute('fill-rule', 'evenodd');

  const { naturalWidth, naturalHeight } = imageDimensions;
  mask.setAttribute('d', `M0 0 h${naturalWidth} v${naturalHeight} h-${naturalWidth} z M${x} ${y} h${w} v${h} h-${w} z`);

  return mask;
}

export const setRectMaskSize = (mask, imageDimensions, x, y, w, h) => {
  const { naturalWidth, naturalHeight } = imageDimensions;
  mask.setAttribute('d', `M0 0 h${naturalWidth} v${naturalHeight} h-${naturalWidth} z M${x} ${y} h${w} v${h} h-${w} z`);
}

/** 
 * Draws an SVG rectangle, either from an annotation, or an
 * (x, y, w, h)-tuple.
 */
export const drawRect = (arg1, arg2, arg3, arg4) => {
  const { x, y, w, h } = arg1.type === 'Annotation' || arg1.type === 'Selection' ?
    parseRectFragment(arg1, arg2) : { x: arg1, y: arg2, w: arg3, h: arg4 };

  const g = document.createElementNS(SVG_NAMESPACE, 'g');

  const outerRect = document.createElementNS(SVG_NAMESPACE, 'rect');
  const innerRect = document.createElementNS(SVG_NAMESPACE, 'rect');

  innerRect.setAttribute('class', 'a9s-inner');
  setXYWH(innerRect, x, y, w, h);

  outerRect.setAttribute('class', 'a9s-outer');
  setXYWH(outerRect, x, y, w, h);

  g.appendChild(outerRect);
  g.appendChild(innerRect);

  return g;
}

/** Gets the (x, y, w, h)-values from the attributes of the SVG group **/
export const getRectSize = g => {
  const outerRect = g.querySelector('.a9s-outer');

  const x = parseFloat(outerRect.getAttribute('x'));
  const y = parseFloat(outerRect.getAttribute('y'));
  const w = parseFloat(outerRect.getAttribute('width'));
  const h = parseFloat(outerRect.getAttribute('height'));

  return { x, y, w, h };
}

/** Applies the (x, y, w, h)-values to the rects in the SVG group **/
export const setRectSize = (g, x, y, w, h) => {
  const innerRect = g.querySelector('.a9s-inner');
  const outerRect = g.querySelector('.a9s-outer');

  setXYWH(innerRect, x, y, w, h);
  setXYWH(outerRect, x, y, w, h);
}

/** 
 * Shorthand to get the area (rectangle w x h) from the 
 * annotation's fragment selector. 
 */
export const rectArea = (annotation, image) => {
  const { w, h } = parseRectFragment(annotation, image);
  return w * h;
}

