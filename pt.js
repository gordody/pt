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

    this._height = size.height;
    this._width = size.width;

    this._textColor = 0x006699;

    this._number = cardData.number;
    this._atomicMass = cardData.atomic_mass;
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
      side: THREE.FrontSide
    });

    const shapes = this._font.generateShapes(message, size);
    const geometry = new THREE.ShapeBufferGeometry(shapes);
    geometry.computeBoundingBox();

    const xMid = 0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
    // const yMid = -0.5 * (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
    geometry.translate(x - this._width / 2 - xMid / 2, y - this._height / 2, 0);
    // make shape ( N.B. edge view not visible )
    const text = new THREE.Mesh(geometry, matLite);
    text.position.z = 1;

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

  focus() {

  }

  rotate() {

  }
}

class PeriodicTable {
  constructor() {
    this._camera = undefined;
    this._scene = undefined;
    this._renderer = undefined;
    this._font = undefined;
    this._raycaster = new THREE.Raycaster();
    this._selected = undefined;

    this._ptData = undefined;
    this._focusedCameraPos = undefined;

    this._cardsByNumber = {};
    this._cardsByGuid = {};
    this._cardsGroup = new THREE.Group();
  }

  async getData() {
    let data;
    try {
      data = await fetch('lib/PeriodicTableJSON.json')
        .then(response => response.json());
    } catch (e) {
      console.error('Error reading data', e, e.stack);
      data = undefined;
    }
    return data;
  }

  initCamera() {
    const box = new THREE.Box3().setFromObject(this._cardsGroup);
    const xMid = 0.5 * (box.max.x - box.min.x);
    const yMid = -0.5 * (box.max.y - box.min.y);

    this._camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100000);
    this._camera.position.set(xMid, yMid, 5000);

    this.initControls({ x: xMid, y: yMid });
  }

  initControls(target) {
    this._controls = new THREE.OrbitControls(this._camera);
    this._controls.target.set(target.x, target.y, 0);
    this._controls.update();
  }

  initScene() {
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0xf0f0f0); // 0x000000
    this._scene.add(this._cardsGroup);
  }

  async initFonts() {
    const fontLoader = new THREE.FontLoader();
    this._font = await new Promise((resolve, reject) => {
      fontLoader.load('fonts/helvetiker_regular.typeface.json',
        font => { resolve(font); },
        (url, itemsLoaded, itemsTotal) => { console.log('Loading font from', url, itemsLoaded, itemsTotal); },
        error => reject(error)
      );
    });
  }

  initRenderer() {
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth, window.innerHeight);
  }

  async init() {
    this._ptData = await this.getData();

    // this.initCamera();
    this.initScene();
    await this.initFonts();
    this.initRenderer();

    document.body.appendChild(this._renderer.domElement);
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    this._renderer.domElement.addEventListener('click', this.onDocumentMouseClick.bind(this), false);
    this._renderer.domElement.addEventListener('touchend', this.onDocumentMouseClick.bind(this), false);
  }

  addCard(card) {
    card.draw();
    this._cardsByNumber[card._number] = card;
    this._cardsByGuid[card._geomGroup.uuid] = card;
    this._cardsGroup.add(card._geomGroup);
  }

  onWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(window.innerWidth, window.innerHeight);
  }

  onDocumentMouseClick(event) {
    event.preventDefault();

    console.log('Got mouse click:', event.clientX, event.clientY);

    const elem = this._renderer.domElement;
    const rect = elem.getBoundingClientRect();

    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(mouse, this._camera);
    const intersects = this._raycaster.intersectObjects(this._scene.children, true);
    if (intersects.length > 0) {
      this._selected = intersects[0].object;
      const card = this._cardsByGuid[this._selected.parent.uuid];
      console.log('Card clicked:', card._name);
      if (!this._focusedCameraPos ||
        (this._focusedCameraPos.x !== this._camera.position.x &&
         this._focusedCameraPos.y !== this._camera.position.y &&
         this._focusedCameraPos.z !== this._camera.position.z)) {
        this._focusedCameraPos = this._camera.position;
        this.focusOnCard(card);
      } else {
        this.flipCard(card);
      }
    }
  }

  focusOnCard(card) {
    const box = new THREE.Box3().setFromObject(card._geomGroup);
    const xMid = 0.5 * (box.max.x - box.min.x);
    const yMid = -0.5 * (box.max.y - box.min.y);

    const position = {
      x: box.min.x + xMid,
      y: box.min.y - yMid,
      z: 500
    };
    const target = {
      x: box.min.x + xMid,
      y: box.min.y - yMid,
      z: 0
    };

    new TWEEN.Tween(this._camera.position)
      .to(position, 1000)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .start();

    new TWEEN.Tween(this._controls.target)
      .to(target, 1000)
      .onUpdate(() => {
        this._controls.update();
      })
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .onComplete(() => {
        this._controls.update();
      })
      .start();
  }

  flipCard(card) {
    const rot = { angle: 0 };
    let prevAngle = 0;
    new TWEEN.Tween(rot)
      .to({ angle: Math.PI }, 1000)
      .onUpdate(({ angle }) => {
        card._geomGroup.rotateY(angle - prevAngle);
        prevAngle = angle;
        console.log('Rotating card by', angle);
      })
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .start();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    TWEEN.update();
    this.render();
  }

  render() {
    this._renderer.render(this._scene, this._camera);
  }
}

// eslint-disable-next-line no-unused-vars
function main() {
  const periodicTable = new PeriodicTable();
  periodicTable.init().then(() => {
    const spacing = 10;
    const size = { height: 162, width: 120 };
    periodicTable._ptData.elements.forEach(element => {
      const coords = {
        x: element.xpos * (size.width + spacing),
        y: -element.ypos * (size.height + spacing),
        z: 100
      };
      const card = new Card(periodicTable._font, size, coords, element);
      periodicTable.addCard(card);
    });
    periodicTable.initCamera();
    periodicTable.animate();
  });
}
