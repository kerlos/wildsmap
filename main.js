import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import gimmick_data from "./data/gimmickdata.json";
import endemic_data from "./data/endemic.json";
import map_area_data from "./data/map_area_points.json";

document.getElementById('version').innerHTML = `<strong>Version:</strong> ${__APP_VERSION__}`;

let MAP_NAMES = new Map();
MAP_NAMES.set("st101", "Windward Plains");
MAP_NAMES.set("st102", "Scarlet Forest");
MAP_NAMES.set("st103", "Oilwell Basin");
MAP_NAMES.set("st104", "Iceshard Cliffs");
MAP_NAMES.set("st503", "Training Area");


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 3000 );
const canvas = document.getElementById('webgl-canvas');
const renderer = new THREE.WebGLRenderer({canvas: canvas});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
renderer.setClearColor(0xffffff, 0);
renderer.shadowMap.enabled = true;


const lightA = new THREE.DirectionalLight( 0xFfFfFf, 1.2);
lightA.position.set(-449, 160, 1500)
lightA.target.position.set(-449, 160, 1500)
//lightA.target.position.set(-800, 0, 1000)
scene.add( lightA );
const lightB = new THREE.DirectionalLight( 0xFFFFFF, 1.2);
lightB.position.set(-400, 815, -400)
lightB.target.position.set(-400, 815, -400)
//lightB.target.position.set(-800, 0, 1000)
scene.add( lightB );
const lightC = new THREE.DirectionalLight( 0xFFFFFF, 1.2);
scene.add( lightC );

//const light = new THREE.PointLight( 0xFFFFFF, 2, 0, 0);
//light.position.set(-800, 400, 1000)
//scene.add( light );

const textureLoader = new THREE.TextureLoader();

const mapNormal = textureLoader.load( "./assets/mapnormal.png" );
const mapDiffuse = textureLoader.load( "./assets/maindiffuse.png" );
const mapMaterial = new THREE.MeshStandardMaterial({
     map: mapDiffuse,
     normalMap: mapNormal,
});
mapMaterial.normalScale.set(-2, -2);
mapMaterial.needsUpdate = true;

const mapDiffuseWater = textureLoader.load( "./assets/mainotherdiffuse.png" );
const mapMaterialWater = new THREE.MeshStandardMaterial({
     map: mapDiffuseWater,
     normalMap: mapNormal
});
mapMaterialWater.normalScale.set(-0.5, -0.5);

const mapDiffuseWall = textureLoader.load( "./assets/walldiffuse.png" );
const mapMaterialWall = new THREE.MeshStandardMaterial({
     map: mapDiffuseWall,
});
mapMaterial.normalScale.set(0.2, 0.2);

const mapDiffuseOutline = textureLoader.load( "./assets/outlinediffuse.png" );
const mapMaterialOutline = new THREE.MeshBasicMaterial({
     map: mapDiffuseOutline,
});
const loader = new GLTFLoader();
loader.load( './assets/st101.glb', function ( model ) {
    model.scene.traverse( child => {
        child.castShadow = true;
        if (child.isMesh) {
            if (child.name.includes("mainOther")){
                child.material = mapMaterialWater;
            }
            else if (child.name.includes("outline")){
                child.material = mapMaterialOutline;
            }
            else if (child.name.includes("wall")){
                child.material = mapMaterialWall;
            }
            if (child.name.includes("main") && !child.name.includes("Other")){
                child.material = mapMaterial;
            }
        } else {
            child = null;
        }
        
    })
    scene.add(model.scene);
}, undefined, function ( error ) {
    console.error( error );
});

renderer.shadowMap.needsUpdate = true;

const gimmicks = new Map();
function loadGimmicks() {
    Object.entries(gimmick_data).forEach(([key, value]) => {
        var path = "";
        if (value.map_icon != "INVALID") {
            path = './assets/gimmick_icons/MHWilds-' + key + ' Map Icon.png';
        }
        else {
            path ='./assets/gimmick_icons/MHWilds-' + value.icon + ' Icon ' + value.color + '.png';
        }
        if (value.name !== null) { // make a better solution for this
            const texture = textureLoader.load( path );
            gimmicks.set(key, {
                data: value,
                texture: texture
            });
        }
    });
}
loadGimmicks();

const endemics = new Map();
function loadEndemic() {
    Object.entries(endemic_data).forEach(([key, value]) => {
        var path = "";
        if (value.map_icon != "INVALID") {
            path = './assets/enemy_icons/MHWilds-' + key + ' Map Icon.png';
        } else {
            path ='./assets/enemy_icons/MHWilds-' + key + ' Icon.png';
        }
        const texture = textureLoader.load( path );
        endemics.set(key, {
            data: value,
            texture: texture
        });
    });
}
loadEndemic();

const areaNumbers = new Map();
function loadAreaNumbers() {
    Object.entries(map_area_data).forEach(([key, value]) => {
        if (key !== "ST101") {
            return;
        }
        Object.entries(value).forEach(([area_num, point]) => {
            const path = "./assets/map_nums/" + area_num + ".png";
            const texture = textureLoader.load( path );
            areaNumbers.set(area_num, {
                point: point,
                areaNum: area_num,
                texture: texture
            });
        });
    });
}
loadAreaNumbers();


const sprites = []
gimmicks.forEach((value, key) => {
    const texture = value.texture;
    value.data.points.forEach((point) => {
        if (point != undefined) {
            const spriteMaterial = new THREE.SpriteMaterial( { map: value.texture } );
            const sprite = new THREE.Sprite( spriteMaterial );
            scene.add( sprite );
            sprite.scale.set( 25, 25, 25 );
            sprite.position.set(point[0], point[1] + 5, point[2]);
            sprite.gimmickId = key;
            sprite.baseScaling = 1.0;
            if (value.data.map_filtering_type === "NON_FILTERING_TARGET") {
                sprite.baseScaling = 1.5;
                sprite.position.set(point[0], point[1] + 10, point[2]);
            }
            sprite.type = "GIMMICK";
            sprites.push(sprite);
        }
    });
});

endemics.forEach((value, key) => {
    const texture = value.texture;
    value.data.st101.points.forEach((point) => {
        if (point != undefined) {
            const spriteMaterial = new THREE.SpriteMaterial( { map: value.texture } );
            const sprite = new THREE.Sprite( spriteMaterial );
            scene.add( sprite );
            sprite.scale.set( 25, 25, 25 );
            sprite.position.set(point[0], point[1] + 5, point[2]);
            sprite.emId = key;
            sprite.type = "ENDEMIC";
            sprite.baseScaling = 1.0;
            sprites.push(sprite)
        }
    });
});

areaNumbers.forEach((value, key) => {
    const texture = value.texture;
    const spriteMaterial = new THREE.SpriteMaterial( { map: value.texture } );
    const sprite = new THREE.Sprite( spriteMaterial );
    scene.add( sprite );
    const point = value.point;
    sprite.scale.set( 20, 20, 20 );
    sprite.position.set(point[0], point[1] + 20, point[2]);
    sprite.areaId = key;
    sprite.type = "AREA_NUMBER";
    sprite.baseScaling = 1.0;
    sprites.push(sprite);
});


const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredSprite = null;
let selectedSprite = null;

const tooltip = document.createElement("div");
tooltip.classList.add("tooltip");
document.body.appendChild(tooltip);

function setInfo(element, sprite, info_type) {
    if (hoveredSprite.type === "GIMMICK") {
        const gimmick = gimmicks.get(hoveredSprite.gimmickId);
        element.innerHTML = `
            <div style="font-weight: bold; color: lightgray;">${gimmick.data.name}</div>
            `;
            if (gimmick.data.explain !== null)
                element.innerHTML += `<div>${gimmick.data.explain}</div>`;
    } else if (hoveredSprite.type === "ENDEMIC") {
        const endemic = endemics.get(hoveredSprite.emId);
        element.innerHTML = `
            <div style="font-weight: bold; color: lightgray;">${endemic.data.name}</div>
            `;
        if (info_type == "EXTENDED") {
            if (endemic.data.memo !== null)
                element.innerHTML += `<div>${endemic.data.memo}</div>`;
        } else {
            if (endemic.data.explain !== null)
                element.innerHTML += `<div>${endemic.data.explain}</div>`;
        }
    } else if (hoveredSprite.type === "AREA_NUMBER") {
        const area = areaNumbers.get(hoveredSprite.areaId).areaNum.split("_");
        const st = area[0];
        const num = area[1];
        element.innerHTML = `<div style="font-weight: bold; color: lightgray;">Area ${num}</div>`;
        element.innerHTML += `<div>An area in the ${MAP_NAMES.get(st)}</div>`;
    }
    tooltip.style.display = "block";
}

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sprites);

    if (intersects.length > 0) {
        if (hoveredSprite !== intersects[0].object) {
            hoveredSprite = intersects[0].object;
        }
        if (!hoveredSprite.visible) return;

        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY + 10}px`;
        setInfo(tooltip, hoveredSprite, "TOOLTIP");
        tooltip.style.display = "block";
    } else {
        hoveredSprite = null;
        tooltip.style.display = "none";
    }
});

const selectedItem = document.getElementById("selected-item");

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sprites);
    
    if (intersects.length > 0) {
        selectedSprite = intersects[0].object;
        if (!selectedSprite.visible) return;

        selectedItem.style.display = "flex";
        setInfo(selectedItem, selectedSprite, "EXTENDED")
    }
});

function updateSprites() {
    const distance = Math.min(camera.position.distanceTo(controls.target), 800);
    const scale = Math.max(32.0 * distance / 700, 10.0);
    sprites.forEach(sprite => {
        const s = scale * sprite.baseScaling;
        sprite.scale.set(s, s, s);
    });
}


const filters = document.getElementById("filters");
const allToggle = document.getElementById("all-gimmicks");
const collectToggle = document.getElementById("collectable");
const hiddenToggle = document.getElementById("hidden");
const trapToggle = document.getElementById("trap");
const nonFilteringToggle = document.getElementById("non-filtering");
const slingerToggle = document.getElementById("slinger");
const endemicToggle = document.getElementById("endemic");
const areaNumToggle = document.getElementById("areanumbers");

updateFilters();

function updateFilters(event) {
    if (event !== undefined) {
        if (!event.target.classList.contains('all-filters')) {
            if (allToggle.checked && !event.target.checked) {
                allToggle.checked = false;
            }
        }
    }
    if (allToggle.checked) {
        collectToggle.checked = true;
        hiddenToggle.checked = true;
        trapToggle.checked = true;
        nonFilteringToggle.checked = true;
        slingerToggle.checked = true;
        endemicToggle.checked = true;
    }
    sprites.forEach(sprite => {
        if (sprite.type === "GIMMICK") {
            const gimmick = gimmicks.get(sprite.gimmickId);
            switch (gimmick.data.map_filtering_type) {
                case "ALL":
                    sprite.visible = allToggle.checked;
                    break;
                case "COLLECT":
                    sprite.visible = collectToggle.checked;
                    break;
                case "ENVIRONMENT_TRAP":
                    sprite.visible = trapToggle.checked;
                    break;
                case "INVISIBLE":
                    sprite.visible = hiddenToggle.checked;
                    break;
                case "INVISIBLE_ADDBEACON":
                    sprite.visible = hiddenToggle.checked;
                    break;
                case "NON_FILTERING_TARGET":
                    sprite.visible = nonFilteringToggle.checked;
                    break;
                case "SLINGER":
                    sprite.visible = slingerToggle.checked;
                    break;
            }
        } else if (sprite.type === "ENDEMIC") {
            sprite.visible = endemicToggle.checked;
        } else if (sprite.type === "AREA_NUMBER") {
            sprite.visible = areaNumToggle.checked;
        }
    });
}

filters.addEventListener('change', updateFilters);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enable = true;
controls.minDistance = 100;
controls.maxDistance = 2000;
controls.staticMoving = true;
controls.zoomSpeed = 1.5;
camera.position.set( -600, 600, 1300 );
controls.target.set( -700, 0, 1400);
camera.lookAt(controls.target);
controls.update();

//renderer.setClearColor( 0xffffff, 1 );
window.addEventListener( 'resize', onWindowResize );
function animate() {
    controls.update();
    renderer.clear();
    updateSprites();
    const pos = camera.position;
    document.getElementById("camera-position").innerText = `Camera: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`;
    renderer.render( scene, camera );
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}
