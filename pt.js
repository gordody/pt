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
}

class PeriodicTable {
  constructor() {
    this._camera = undefined;
    this._scene = undefined;
    this._renderer = undefined;
    this._font = undefined;
    this._raycaster = new THREE.Raycaster();
    this._focusedCard = undefined;
    this._selectedCard = undefined;

    this._ptCoordArray = [];
    this._pfCoordArray = [];

    this._toolbarElem = undefined;
    this._toolbarButtons = [];

    this._cardsByNumber = {};
    this._cardsByGuid = {};
    this._cardsGroup = new THREE.Group();
  }

  setPtCoords(ptCoordArray) {
    this._ptCoordArray = ptCoordArray;
  }

  setPfCoords(pfCoordArray) {
    this._pfCoordArray = pfCoordArray;
  }


  destroy() {
    this._controls.removeEventListener(this._controlChangeEventListener);

    window.removeEventListener('resize', this._windowResizeListener, false);
    this._renderer.domElement.removeEventListener('click', this._clickListener, false);
    this._renderer.domElement.removeEventListener('touchend', this._touchEndListener, false);
  }

  initCamera() {
    // const cardsGroup = new THREE.Group();
    // Object.values(this._cardsByGuid).forEach(card => cardsGroup.add(card._geomGroup));
    // const box = new THREE.Box3().setFromObject(cardsGroup);
    const box = new THREE.Box3().setFromObject(this._cardsGroup);
    const xMid = 0.5 * (box.max.x - box.min.x);
    const yMid = -0.5 * (box.max.y - box.min.y);
    const zMid = 0.5 * (box.max.z - box.min.z);

    this._camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100000);
    this._camera.position.set(xMid, yMid, zMid - 1000);

    this.initControls({ x: xMid, y: yMid });
  }

  initControls(target) {
    this._controls = new THREE.OrbitControls(this._camera);
    this._controls.enableDamping = true;
    this._controls.target.set(target.x, target.y, 0);
    this._controls.update();

    this._controlChangeEventListener = this.controlChangeEventListener.bind(this);;
    this._controls.addEventListener('end', this._controlChangeEventListener);
  }

  controlChangeEventListener({type}) {
    console.debug('controlChangeEvent', type);
    // this._focusedCard = undefined;
    // if (this._selectedCard) {
    //   this._selectedCard.flip(true);
    //   this._selectedCard = undefined;
    // }
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

  toolbarClickHandler(evt) {
    console.log('Button clicked', evt.target.id);
    if (evt.target.getAttribute('id') === 'periodicTableModeButton') {
      this.moveCards(this._ptCoordArray, Object.values(this._cardsByNumber));
    } else if (evt.target.getAttribute('id') === 'paraflowModeButton') {
      this.moveCards(this._pfCoordArray, Object.values(this._cardsByNumber));
    } else {

    }
  }

  initToolbar() {
    this._toolbarClickHandler = this.toolbarClickHandler.bind(this);

    this._toolbarElem = document.createElement('div');
    this._toolbarElem.setAttribute('id', 'periodicTableToolbar');
    this._toolbarElem.onclick = this._toolbarClickHandler;

    this._periodicTableModeButton = document.createElement('div');
    this._periodicTableModeButton.setAttribute('id', 'periodicTableModeButton');
    this._periodicTableModeButton.setAttribute('class', 'toolbarButton');
    this._periodicTableModeButton.innerHTML = 'PT';
    this._toolbarButtons.push(this._periodicTableModeButton);

    this._paraflowModeButton = document.createElement('div');
    this._paraflowModeButton.setAttribute('id','paraflowModeButton');
    this._paraflowModeButton.setAttribute('class','toolbarButton');
    this._paraflowModeButton.innerHTML = 'PF';
    this._toolbarButtons.push(this._paraflowModeButton);

    this._toolbarButtons.forEach(button => this._toolbarElem.appendChild(button));
    document.body.appendChild(this._toolbarElem);
  }

  async init() {
    this.initToolbar();
    // this.initCamera();
    this.initScene();
    await this.initFonts();
    this.initRenderer();

    document.body.appendChild(this._renderer.domElement);

    this._windowResizeListener = this.onWindowResize.bind(this);
    this._clickListener = this.onDocumentMouseClick.bind(this);
    this._touchEndListener = this.onDocumentMouseClick.bind(this);

    window.addEventListener('resize', this._windowResizeListener, false);
    this._renderer.domElement.addEventListener('click', this._clickListener, false);
    this._renderer.domElement.addEventListener('touchend', this._touchEndListener, false);
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
      const selectedObj = intersects[0].object;
      const clickedCard = this._cardsByGuid[selectedObj.parent.uuid];
      console.log('Card clicked:', clickedCard._name);
      if (clickedCard !== this._focusedCard) {
        if (this._selectedCard) {
          this._selectedCard.flip(true);
          this._selectedCard = undefined;
        }
        this._focusedCard = clickedCard;
        this.focusOnCard(this._focusedCard);
      } else {
        this._selectedCard = this._focusedCard;
        this._selectedCard.flip();
      }
    } else {
      if (this._selectedCard) {
        this._selectedCard.flip(true);
        this._selectedCard = undefined;
        this._focusedCard = undefined;
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

  moveCards(arrPositions, arrCards) {
    const headTween = new TWEEN.Tween(arrCards[0]._geomGroup.position)
      .to(arrPositions[0], 1000);

    let currTween = headTween;
    for (let i = 1; i < arrCards.length; i++) {
      const newTween = new TWEEN.Tween(arrCards[i]._geomGroup.position)
        .to(arrPositions[i], 1000);
      currTween.onStart(obj => { 
        newTween.start(); 
      });
      currTween = newTween;
    }

    headTween.start();
    currTween.onComplete(() => {
      this.initCamera();
    });
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    TWEEN.update();
    this._controls.update();
    this.render();
  }

  render() {
    this._renderer.render(this._scene, this._camera);
  }
}

async function getPtData() {
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

// eslint-disable-next-line no-unused-vars
function main() {
  const ptCoordArray = [];
  const pfCoordArray = [];
  
  const pfWidth = 6;
  const pfHeight = 5;
  const pfDepth = 4;

  const origoCoords = { x: 0,  y: 0,  z: 0 };

  const periodicTable = new PeriodicTable();
  
  getPtData().then(ptData => {
    periodicTable.init().then(() => {
      const spacing = 10;
      const size = { height: 162, width: 120 };
      ptData.elements.forEach(element => {
        const ptCoords = {
          x: element.xpos * (size.width + spacing),
          y: -element.ypos * (size.height + spacing),
          z: 100
        };
        ptCoordArray.push(ptCoords);

        let n = element.number - 1;
        const pfCoords = {
          x: (n % pfWidth) * (2 * size.width + spacing),
          y: (Math.floor(n / pfWidth) % pfHeight) * (2 * size.height + spacing),
          z: (Math.floor(n / (pfWidth * pfHeight)) % pfDepth) * 2 * size.width,
        };
        pfCoordArray.push(pfCoords);

        // const card = new Card(periodicTable._font, size, ptCoords, element);
        const card = new Card(periodicTable._font, size, origoCoords, element);
        periodicTable.addCard(card);
      });
      periodicTable.setPtCoords(ptCoordArray);
      periodicTable.setPfCoords(pfCoordArray);

      periodicTable.initCamera();
      periodicTable.animate();
      periodicTable.moveCards(ptCoordArray, Object.values(periodicTable._cardsByNumber));
      
    });
  });
}
