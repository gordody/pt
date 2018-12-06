/* global fetch, THREE, TWEEN */

//
// preiodic table with three js
//

class Card {
  constructor(font, size, coords, cardData) {
    this._font = font;
    this._geomGroup = new THREE.Group();

    this._controls = undefined;
    this._pos = coords;
    // this._rot = undefined;
    this._isFlipped = false;

    this._windowResizeListener = undefined;
    this._clickListener = undefined;
    this._touchEndListener = undefined;

    this._controlChangeEventListener = undefined;

    this._height = size.height;
    this._width = size.width;

    this._textColor = 0x006699;

    this._number = cardData.number;
    this._atomicMass = cardData.atomic_mass.toFixed(2);
    this._name = cardData.name;
    this._symbol = cardData.symbol;
    this._discoverer = cardData.discovered_by;
  }

  addShape(shape, color, x, y, z, rx, ry, rz, s) {
    const geometry = new THREE.ShapeBufferGeometry(shape);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: color,
      opacity: 0.3,
      transparent: true,
      side: THREE.DoubleSide
    }));
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.scale.set(s, s, s);

    this._geomGroup.add(mesh);
  }

  roundedRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x, y + radius);
    ctx.lineTo(x, y + height - radius);
    ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
    ctx.lineTo(x + width - radius, y + height);
    ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    ctx.lineTo(x + width, y + radius);
    ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
    ctx.lineTo(x + radius, y);
    ctx.quadraticCurveTo(x, y, x, y + radius);
  }

  addRoundedRect() {
    const roundedRectShape = new THREE.Shape();
    this.roundedRect(roundedRectShape, 0, 0, this._width, this._height, 5);
    this.addShape(roundedRectShape, 0x006699, -this._width / 2, -this._height / 2, 0, 0, 0, 0, 1);
  }

  addText(message, x, y, size) {
    const color = this._textColor;

    const matLite = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      side: THREE.FrontSide   // FrontSide or DoubleSide ?
    });

    const shapes = this._font.generateShapes(message, size);
    const geometry = new THREE.ShapeBufferGeometry(shapes);
    geometry.computeBoundingBox();

    const xMid = 0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
    // const yMid = -0.5 * (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
    geometry.translate(x - this._width / 2 - xMid, y - this._height / 2, 0);
    // make shape ( N.B. edge view not visible )
    const text = new THREE.Mesh(geometry, matLite);
    text.position.z = 2;

    this._geomGroup.add(text);
  }

  draw() {
    this.addRoundedRect();

    this.addText('' + this._number, this._width * 0.8, this._height * 0.8, this._height * 0.075);
    this.addText(this._symbol, this._width * 0.5, this._height * 0.37, this._height * 0.3);
    this.addText(this._name, this._width * 0.5, this._height * 0.19, this._height * 0.075);
    this.addText('' + this._atomicMass, this._width * 0.5, this._height * 0.075, this._height * 0.075);

    this._geomGroup.translateX(this._pos.x);
    this._geomGroup.translateY(this._pos.y);
  }

  flip(forceFront) {
    if (forceFront && !this._isFlipped) {
      return;
    }
    let fromAngle = 0;
    let toAngle = Math.PI;
    if (this._isFlipped) {
      fromAngle = Math.PI;
      toAngle = 0;
    }
    console.log('Flip from', fromAngle, 'to', toAngle)
    const rot = { angle: fromAngle };
    let prevAngle = fromAngle;
    new TWEEN.Tween(rot)
      .to({ angle: toAngle }, 1000)
      .onUpdate(({ angle }) => {
        const nextRot = angle - prevAngle;
        // console.debug('flipping by', nextRot);
        this._geomGroup.rotateY(nextRot);
        prevAngle = angle;
      })
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .start();

    this._isFlipped = !this._isFlipped;
  }

  move(toPosition, msDuration) {
    return new TWEEN.Tween(this._geomGroup.position)
      .to(toPosition, msDuration || 1000);
  }

  getCurrLookAt() {
    const box = new THREE.Box3().setFromObject(this._geomGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const a = new THREE.Vector3(box.max.x - box.min.x, box.min.y, box.min.z);
    const b = new THREE.Vector3(box.min.x, box.max.y - box.min.y, box.min.z);

    // currLookAt = center + (a x b)
    return center.add(a.cross(b));
  }

  lookAt(toPoint, msDuration) {
    const currLookAt = this.getCurrLookAt();
    return new TWEEN.Tween(currLookAt)
      .onUpdate(vec => {
        this._geomGroup.lookAt(vec);
      })
      .to(toPoint, msDuration || 1000);
  }
}
