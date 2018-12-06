
async function getPtData() {
  let data;
  try {
    data = await fetch('js/lib/PeriodicTableJSON.json')
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
  const sphereCoordArray = [];
  const sphereLookAtCoordArray = [];
  
  const spacing = 10;
  const size = { height: 162, width: 120 };

  const pfWidth = 6;
  const pfHeight = 5;
  const pfDepth = 4;

  const mostCardsAroundSphere = 30; 
  const sphereCircumference = mostCardsAroundSphere * (size.width + spacing);
  const sphereRadius = sphereCircumference / 2 / Math.PI;
  const sphereCardRows = Math.floor(sphereCircumference / (size.height + spacing));
  const phiIncrement = 2 * Math.PI / sphereCardRows;

  const origoCoords = { x: 0,  y: 0,  z: 0 };

  const periodicTable = new PeriodicTable();
  const ptUI = new PeriodicTableUI();
  
  getPtData().then(ptData => {
    periodicTable.init().then(() => {

      ptData.elements.forEach(element => {
        // periodic table
        const ptCoords = {
          x: (element.xpos - 1) * (size.width + spacing),
          y: -(element.ypos - 1) * (size.height + spacing),
          z: 100
        };
        ptCoordArray.push(ptCoords);

        // paraflow
        let n = element.number - 1;
        const pfCoords = {
          x: (n % pfWidth) * (2 * size.width + spacing),
          y: (Math.floor(n / pfWidth) % pfHeight) * (2 * size.height + spacing),
          z: (Math.floor(n / (pfWidth * pfHeight)) % pfDepth) * 2 * size.width,
        };
        pfCoordArray.push(pfCoords);

        // sphere
        let theta = 0;
        let phi = phiIncrement;
        const vec3 = new THREE.Vector3();

        const currRadius = sphereRadius * Math.sin(phi);
        const currCircumference = 2 * currRadius * Math.PI;

        const cardsInCircle = Math.floor(currCircumference / (size.width + spacing));
        const cardAngle = 2 * Math.PI / cardsInCircle;
        theta = cardAngle * (n % cardsInCircle);
        phi = Math.floor(n / cardsInCircle) % sphereCardRows;

        vec3.setFromSphericalCoords(currRadius, phi, theta);
        const sphereCoords = {
          x: vec3.x,
          y: vec3.y,
          z: vec3.z
        };
        const sphereLookAtCoords = {
          x: 0,
          y: 0,
          z: 0
        };
        sphereCoordArray.push(sphereCoords);
        sphereLookAtCoordArray.push(sphereLookAtCoords);

        // const card = new Card(periodicTable._font, size, ptCoords, element);
        const card = new Card(periodicTable._font, size, origoCoords, element);
        periodicTable.addCard(card);
      });

      periodicTable.setCoordsForMode(ptCoordArray, 'periodicTableMode');
      periodicTable.setCoordsForMode(pfCoordArray, 'paraflowMode');
      periodicTable.setCoordsForMode(sphereCoordArray, 'sphereMode');
      periodicTable.setLookAtTargetCoordsForMode(sphereLookAtCoordArray, 'sphereMode');

      periodicTable.initCamera();
      periodicTable.animate();
      periodicTable.setMode('periodicTableMode');

      
      ptUI.addToolbarButton('periodicTableModeButton', 'Periodic Table', 
        periodicTable.setMode.bind(periodicTable, 'periodicTableMode'));
      ptUI.addToolbarButton('paraflowModeButton', 'Paraflow',
        periodicTable.setMode.bind(periodicTable, 'paraflowMode'));
      ptUI.addToolbarButton('sphereModeButton', 'Sphere',
        periodicTable.setMode.bind(periodicTable, 'sphereMode'));
      ptUI.addToolbarButton('debugGetControlInfoButton', 'ControlInfo', () => {
        console.log('Control info:', periodicTable._camera.position, periodicTable._controls.target);
      });
      
    });
  });
}
