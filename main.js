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

let frames = 0, prevTime = performance.now();

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

class Stage {
    constructor(id, name, modelPath, scene) {
        this.id = id;
        this.name = name;
        this.model = null;
        this.areaNumbers = new THREE.Group();
        this.gimmicks = new THREE.Group();
        this.endemic = new THREE.Group();

        this.collectables = new THREE.Group();
        this.environment = new THREE.Group();
        this.hidden = new THREE.Group();
        this.nonFiltering = new THREE.Group();
        this.slinger = new THREE.Group();
        this.gimmicks.add(this.collectables);
        this.gimmicks.add(this.environment);
        this.gimmicks.add(this.endemic);
        this.gimmicks.add(this.nonFiltering);
        this.gimmicks.add(this.slinger);

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
        loader.load( modelPath, function ( model ) {
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
            });
            scene.add(model.scene);
            this.model = model.scene;
        }.bind(this), undefined, function ( error ) {
            console.error( error );
        });
    }
}

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
            const area = area_num.split("_");
            const st = area[0];
            const num = area[1];
            const name = `${MAP_NAMES.get(st)} ${num}`;
            areaNumbers.set(area_num, {
                data: {
                    point: point,
                    areaNum: area_num,
                    name: name,
                },
                texture: texture
            });
        });
    });
}
loadAreaNumbers();


const st101 = new Stage("st101", "Windward Plains", "./assets/st101.glb", scene)
const sprites = []
gimmicks.forEach((value, key) => {
    value.data.points.forEach((point) => {
        if (point != undefined) {
            const spriteMaterial = new THREE.SpriteMaterial( { map: value.texture } );
            const sprite = new THREE.Sprite( spriteMaterial );
            sprite.scale.set( 25, 25, 25 );
            sprite.position.set(point[0], point[1] + 5, point[2]);
            sprite.gimmickId = key;
            sprite.baseScaling = 1.0;

            switch (value.data.map_filtering_type) {
                case "COLLECT":
                    st101.collectables.add(sprite);
                    break;
                case "ENVIRONMENT_TRAP":
                    st101.environment.add(sprite);
                    break;
                case "INVISIBLE":
                    st101.hidden.add(sprite);
                    break;
                case "INVISIBLE_ADDBEACON":
                    st101.hidden.add(sprite);
                    break;
                case "NON_FILTERING_TARGET":
                    sprite.baseScaling = 1.5;
                    sprite.position.set(point[0], point[1] + 10, point[2]);
                    st101.nonFiltering.add(sprite);
                    break;
                case "SLINGER":
                    st101.slinger.add(sprite);
                    break;
            }

            sprite.type = "GIMMICK";
            sprites.push(sprite);
        }
    });
});

endemics.forEach((value, key) => {
    value.data.st101.points.forEach((point) => {
        if (point != undefined) {
            const spriteMaterial = new THREE.SpriteMaterial( { map: value.texture } );
            const sprite = new THREE.Sprite( spriteMaterial );
            sprite.scale.set( 25, 25, 25 );
            sprite.position.set(point[0], point[1] + 5, point[2]);
            sprite.emId = key;
            sprite.type = "ENDEMIC";
            sprite.baseScaling = 1.0;
            sprites.push(sprite)
            st101.endemic.add(sprite)
        }
    });
});

areaNumbers.forEach((value, key) => {
    const spriteMaterial = new THREE.SpriteMaterial( { map: value.texture } );
    const sprite = new THREE.Sprite( spriteMaterial );
    const point = value.data.point;
    sprite.scale.set( 20, 20, 20 );
    sprite.position.set(point[0], point[1] + 20, point[2]);
    sprite.areaId = key;
    sprite.type = "AREA_NUMBER";
    sprite.baseScaling = 1.0;
    sprites.push(sprite);
    st101.areaNumbers.add(sprite)
});

scene.add(st101.areaNumbers);
scene.add(st101.gimmicks);
scene.add(st101.endemic);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredSprite = null;
let selectedSprite = null;

const tooltip = document.createElement("div");
tooltip.classList.add("tooltip");
document.body.appendChild(tooltip);

let languages = [
    "Japanese",
    "English",
    "French",
    "Italian",
    "German",
    "Spanish",
    "Russian",
    "Polish",
    "PortugueseBr",
    "Korean",
    "TransitionalChinese",
    "SimplelifiedChinese",
    "Arabic",
    "LatinAmericanSpanish",
];
let lang = document.getElementById("language").value;

document.getElementById("language").addEventListener("change", function() {
    lang = this.value;
    setInfo(selectedItem, selectedSprite, "EXTENDED")
});

function setInfo(element, sprite, info_type) {
    if (sprite.type === "GIMMICK") {
        console.log("here")
        const gimmick = gimmicks.get(sprite.gimmickId);
        element.innerHTML = `
            <div style="font-weight: bold; color: lightgray;">${gimmick.data.name_langs[lang]}</div>
            `;
        if (gimmick.data.explain !== null)
            element.innerHTML += `<div>${gimmick.data.explain_langs[lang]}</div>`;
    } else if (sprite.type === "ENDEMIC") {
        const endemic = endemics.get(sprite.emId);
        element.innerHTML = `
            <div style="font-weight: bold; color: lightgray;">${endemic.data.name_langs[lang]}</div>
            `;
        if (info_type == "EXTENDED") {
            if (endemic.data.memo !== null)
                element.innerHTML += `<div>${endemic.data.memo_langs[lang]}</div>`;
        } else {
            if (endemic.data.explain !== null)
                element.innerHTML += `<div>${endemic.data.explain_langs[lang]}</div>`;
        }
    } else if (sprite.type === "AREA_NUMBER") {
        const area = areaNumbers.get(sprite.areaId).data.areaNum.split("_");
        const st = area[0];
        const num = area[1];
        element.innerHTML = `<div style="font-weight: bold; color: lightgray;">Area ${num}</div>`;
        element.innerHTML += `<div>An area in the ${MAP_NAMES.get(st)}</div>`;
    }
    tooltip.style.display = "block";
}

function isVisible(sprite) {
    let result = false;

    switch (sprite.type) {
        case "GIMMICK":
            var data = null;
            data = gimmicks.get(sprite.gimmickId).data;
            switch (data.map_filtering_type) {
                case "COLLECT":
                    result = collectToggle.checked;
                    break;
                case "ENVIRONMENT_TRAP":
                    result = trapToggle.checked;
                    break;
                    break;
                case "INVISIBLE":
                    result =  hiddenToggle.checked;
                    break;
                case "INVISIBLE_ADDBEACON":
                    result = hiddenToggle.checked;
                    break;
                case "NON_FILTERING_TARGET":
                    result = nonFilteringToggle.checked;
                    break;
                case "SLINGER":
                    result = slingerToggle.checked;
                    break;
            }
            break;
        case "AREA_NUMBER":
            result = areaNumToggle.checked;
            break;
        case "ENDEMIC":
            result = endemicToggle.checked;
            break;
    }
    return result;
}

function getFirstIntersectingVisibleSprite(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sprites);
    if (intersects.length > 0) {
        let i = 0;
        while (typeof intersects[i] !== "undefined" && (!intersects[i].object.visible || !isVisible(intersects[i].object))) {
            i++;
        }
        if (i >= intersects.length) {
            hoveredSprite = null;
            return false
        }
        if (hoveredSprite !== intersects[i].object) {
            hoveredSprite = intersects[i].object;
        }
        return true;
    }
    return false;
}

window.addEventListener('mousemove', (event) => {
    const res = getFirstIntersectingVisibleSprite(event);
    if (res){
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
    const res = getFirstIntersectingVisibleSprite(event);
    if (res){
        selectedSprite = hoveredSprite;
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
const selectToggle = document.getElementById("selectall");
const deselectToggle = document.getElementById("deselect");
const collectToggle = document.getElementById("collectable");
const hiddenToggle = document.getElementById("hidden");
const trapToggle = document.getElementById("trap");
const nonFilteringToggle = document.getElementById("non-filtering");
const slingerToggle = document.getElementById("slinger");
const endemicToggle = document.getElementById("endemic");
const areaNumToggle = document.getElementById("areanumbers");
const searchBar = document.getElementById("search-filter")

updateFilters();

function updateFilters(event) {
    if (event !== undefined) {
        if (!event.target.classList.contains('selectall')) {
            if (selectToggle.checked && !event.target.checked) {
                selectToggle.checked = false;
            }
        } else {
            if (event.target.checked) {
                collectToggle.checked = true;
                hiddenToggle.checked = true;
                trapToggle.checked = true;
                nonFilteringToggle.checked = true;
                slingerToggle.checked = true;
                endemicToggle.checked = true;
                areaNumToggle.checked = true;
                deselectToggle.checked = false;
            }
        }
        if (!event.target.classList.contains('deselectall')) {
            if (deselectToggle.checked && event.target.checked) {
                deselectToggle.checked = false;
            }
        } else {
            if (event.target.checked) {
                collectToggle.checked = false;
                hiddenToggle.checked = false;
                trapToggle.checked = false;
                nonFilteringToggle.checked = false;
                slingerToggle.checked = false;
                endemicToggle.checked = false;
                areaNumToggle.checked = false;
                selectToggle.checked = false;
            }
        }
    }

    const searchVal = searchBar.value.toLowerCase();
    st101.endemic.visible = endemicToggle.checked;
    st101.areaNumbers.visible = areaNumToggle.checked;
    st101.collectables.visible = collectToggle.checked;
    st101.environment.visible = trapToggle.checked;
    st101.endemic.visible = endemicToggle.checked;
    st101.slinger.visible = slingerToggle.checked;
    st101.hidden.visible = hiddenToggle.checked;
    st101.nonFiltering.visible = nonFilteringToggle.checked;

    if (event !== undefined) {
        if (!event.target.classList.contains('search')) {
            sprites.forEach(sprite => {
                var data = null;
                switch (sprite.type) {
                    case "GIMMICK":
                        data = gimmicks.get(sprite.gimmickId).data;
                        break;
                    case "AREA_NUMBER":
                        data = areaNumbers.get(sprite.areaId).data;
                        break;
                    case "ENDEMIC":
                        data = endemics.get(sprite.emId).data;
                        break;
                }
                sprite.visible = data.name.toLowerCase().includes(searchVal);
            }); 
        }
    }
}

filters.addEventListener('change', updateFilters);

camera.position.set( -600, 600, 1300 );
function initControls(camera) {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enable = true;
    controls.minDistance = 100;
    controls.maxDistance = 2000;
    controls.staticMoving = true;
    controls.zoomSpeed = 1.5;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    controls.target.set( -700, 0, 1400);
    camera.lookAt(controls.target);
    return controls
}

const controls = initControls(camera);
controls.update();

window.addEventListener( 'resize', onWindowResize );
function animate() {

    /*frames ++;
    const time = performance.now();

    if ( time >= prevTime + 1000 ) {

        console.log( Math.round( ( frames * 1000 ) / ( time - prevTime ) ) );

        frames = 0;
        prevTime = time;

    }*/

    controls.update();
    renderer.clear();
    updateSprites();
    const pos = camera.position;
    document.getElementById("camera-position").innerText = `xyz (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})`;
    renderer.render( scene, camera );
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

document.querySelectorAll(".toggleButton").forEach(button => {
    button.addEventListener("click", function () {
        let content = this.nextElementSibling;
        let arrow = this.querySelector(".arrow");

        if (content.style.maxHeight) {
            content.style.maxHeight = null;
            arrow.textContent = "▶"; // Arrow points right when collapsed
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
            arrow.textContent = "▼"; // Arrow points down when expanded
        }
    });
});
