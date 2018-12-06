/* global fetch, THREE, TWEEN */

//
// preiodic table with three js
//

class PeriodicTable {
  constructor() {
    this._camera = new THREE.PerspectiveCamera(45, 1, 1, 100000);
    this._scene = undefined;
    this._renderer = undefined;
    this._font = undefined;
    this._raycaster = new THREE.Raycaster();
    this._focusedCard = undefined;
    this._selectedCard = undefined;

    this._mode = undefined;
    this._coordArrays = {};
    this._lookAtCoordArrays = {};

    this._cardsByNumber = {};
    this._cardsByGuid = {};
    this._cardsGroup = new THREE.Group();
  }

  setCoordsForMode(coordArray, mode) {
    this._coordArrays[mode] = coordArray;
  }

  setLookAtTargetCoordsForMode(coordArray, mode) {
    this._lookAtCoordArrays[mode] = coordArray;
  }

  destroy() {
    this._controls.removeEventListener(this._controlChangeEventListener);

    window.removeEventListener('resize', this._windowResizeListener, false);
    this._renderer.domElement.removeEventListener('click', this._clickListener, false);
    this._renderer.domElement.removeEventListener('touchend', this._touchEndListener, false);
  }

  initCamera() {
    const box = new THREE.Box3().setFromObject(this._cardsGroup);
    const xMid = 0.5 * (box.max.x - box.min.x) + box.min.x;
    const yMid = -0.5 * (box.max.y - box.min.y);
    const zMid = 0.5 * (box.max.z - box.min.z) + box.min.z;

    this._camera.fov = 45;
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.near = 1;
    this._camera.far = 1000000;
    this._camera.position.set(xMid, yMid, 1.5 * xMid / Math.tan(Math.PI * 45 / 2 / 180));
    console.log('camera position', this._camera.position);

    this.initControls({ x: xMid, y: yMid, z: 0 });
  }

  initControls(target) {
    this._controls = new THREE.OrbitControls(this._camera);
    this._controls.enableDamping = true;
    this._controls.target.set(target.x, target.y, target.z);
    this._controls.update();
    console.log('controls target', this._controls.target);

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

  async init() {
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

  focusAllCards() {
    const box = new THREE.Box3().setFromObject(this._cardsGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);

    this._camera.fov = 45;
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.near = 1;
    this._camera.far = 1000000;

    const position = {
      x: center.x,
      y: center.y,
      z: 1.5 * center.x / Math.tan(Math.PI * 45 / 2 / 180)
    };
    const target = {
      x: center.x,
      y: center.y,
      z: 0
    };

    console.log('camera position', this._camera.position);

    const positionTween = new TWEEN.Tween(this._camera.position)
      .to(position, 1000)
      .easing(TWEEN.Easing.Sinusoidal.InOut);

    /* const targetTween = */ new TWEEN.Tween(this._controls.target)
      .to(target, 1000)
      .onStart(() => { positionTween.start(); })
      .onUpdate(() => {
        this._controls.update();
      })
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .onComplete(() => {
        this._controls.update();
      })
      .start();
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

    const positionTween = new TWEEN.Tween(this._camera.position)
      .to(position, 1000)
      .easing(TWEEN.Easing.Sinusoidal.InOut);

    new TWEEN.Tween(this._controls.target)
      .to(target, 1000)
      .onStart(() => { positionTween.start(); })
      .onUpdate(() => {
        this._controls.update();
      })
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .onComplete(() => {
        this._controls.update();
      })
      .start();
  }

  initCardPositions(mode, arrCards) {
    const arrPositions = this._coordArrays[mode];
    if (!arrPositions) {
      console.warn('initCardPositions: No coordinate array for mode', mode);
    }
    const arrLookAtCoords = this._lookAtCoordArrays[mode];

    const headPosTween = new TWEEN.Tween(arrCards[0]._geomGroup.position)
      .to(arrPositions[0], 1000);
    
    let headLookAtTween;
    if (arrLookAtCoords) {
      headLookAtTween = new TWEEN.Tween(arrCards[0].getCurrLookAt())
        .to(arrLookAtCoords[0], 1000);
    }

    let currPosTween = headPosTween;
    let currLookAtTween = headLookAtTween;
    for (let i = 1; i < arrCards.length; i++) {
      const newPosTween = arrCards[i].move(arrPositions[i]);
      currPosTween.onStart(obj => { 
        newPosTween.start();
      });
      currPosTween = newPosTween;

      if (arrLookAtCoords) {
        const newLookAtTween = arrCards[i].lookAt(arrLookAtCoords[i]);
        currLookAtTween.onStart(obj => { 
          newLookAtTween.start();
        });
        currLookAtTween = newLookAtTween;
      }
    }

    currPosTween.onComplete(() => {
      this.focusAllCards();
    });
    headPosTween.start();
    if (arrLookAtCoords) {
      headLookAtTween.start();
    }
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

  // control interface
  setMode(mode) {
    this.initCardPositions(mode, Object.values(this._cardsByNumber));
  }
}
