/* global fetch, THREE */

//
// preiodic table with three js
//

class Card {
  constructor(font, size, coords, cardData) {
    this.font = font;
    this.group = new THREE.Group();

    this._pos = coords;
    // this._rot = undefined;

    this._height = size.height;
    this._width = size.width;

    this._textColor = 0x000000;

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

    this.group.add(mesh);
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
    this.addShape(roundedRectShape, 0x006699, 0, 0, 0, 0, 0, 0, 1);
  }

  addText(message, x, y, size) {
    const color = 0x006699;

    const matLite = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });

    const shapes = this.font.generateShapes(message, size);
    const geometry = new THREE.ShapeBufferGeometry(shapes);
    geometry.computeBoundingBox();

    const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
    geometry.translate(x + xMid, y, 0);
    // make shape ( N.B. edge view not visible )
    const text = new THREE.Mesh(geometry, matLite);
    text.position.z = 1;

    this.group.add(text);
  }

  draw() {
    this.addRoundedRect();

    this.addText('' + this._number, this._width * 0.8, this._height * 0.8, this._height * 0.075);
    this.addText(this._symbol, this._width * 0.5, this._height * 0.37, this._height * 0.3);
    this.addText(this._name, this._width * 0.5, this._height * 0.19, this._height * 0.075);
    this.addText('' + this._atomicMass, this._width * 0.5, this._height * 0.075, this._height * 0.075);

    this.group.translateX(this._pos.x);
    this.group.translateY(this._pos.y);
  }
}

class PeriodicTable {
  constructor() {
    this.camera = undefined;
    this.scene = undefined;
    this.renderer = undefined;
    this.font = undefined;

    this.ptData = undefined;

    this.cardsByNumber = {};
    this.cardsGroup = new THREE.Group();
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
    const box = new THREE.Box3().setFromObject(this.cardsGroup);
    const xMid = 0.5 * (box.max.x - box.min.x);
    const yMid = -0.5 * (box.max.y - box.min.y);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100000);
    this.camera.position.set(xMid, yMid, 5000);
    const controls = new THREE.OrbitControls(this.camera);
    controls.target.set(xMid, yMid, 0);
    controls.update();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0); // 0x000000
    this.scene.add(this.cardsGroup);
  }

  async initFonts() {
    const fontLoader = new THREE.FontLoader();
    this.font = await new Promise((resolve, reject) => {
      fontLoader.load('fonts/helvetiker_regular.typeface.json',
        font => { resolve(font); },
        (url, itemsLoaded, itemsTotal) => { console.log('Loading font from', url, itemsLoaded, itemsTotal); },
        error => reject(error)
      );
    });
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  async init() {
    this.ptData = await this.getData();

    // this.initCamera();
    this.initScene();
    await this.initFonts();
    this.initRenderer();

    document.body.appendChild(this.renderer.domElement);
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }

  addCard(card) {
    card.draw();
    this.cardsByNumber[card._number] = card;
    this.cardsGroup.add(card.group);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

// eslint-disable-next-line no-unused-vars
function main() {
  const periodicTable = new PeriodicTable();
  periodicTable.init().then(() => {
    const spacing = 10;
    const size = { height: 162, width: 120 };
    periodicTable.ptData.elements.forEach(element => {
      const coords = {
        x: element.xpos * (size.width + spacing),
        y: -element.ypos * (size.height + spacing),
        z: 100
      };
      const card = new Card(periodicTable.font, size, coords, element);
      periodicTable.addCard(card);
    });
    periodicTable.initCamera();
    periodicTable.animate();
  });
}
