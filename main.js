import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import gimmick_data from "./data/gimmickdata.json";
import endemic_data from "./data/endemic.json";
import map_area_data from "./data/map_area_points.json";
import map_label_data from "./data/map_label_points.json";

// Get the language from URL query parameter
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

document.getElementById(
    "version"
).innerHTML = `<strong>Version:</strong> ${__APP_VERSION__}`;

let MAP_NAMES = new Map();
MAP_NAMES.set("st101", "Windward Plains");
MAP_NAMES.set("st102", "Scarlet Forest");
MAP_NAMES.set("st103", "Oilwell Basin");
MAP_NAMES.set("st104", "Iceshard Cliffs");
MAP_NAMES.set("st105", "Ruins of Wyveria");
MAP_NAMES.set("st503", "Training Area");

const STAGES = [
    "st101",
    "st102",
    "st103",
    "st104",
    "st105",
    "st401",
    "st201",
    "st202",
    "st203",
    "st203",
    "st204",
    "st402",
    "st403",
    "st404",
    "st503",
];

let frames = 0,
    prevTime = performance.now();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    3000
);
const canvas = document.getElementById("webgl-canvas");
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.setClearColor(0xffffff, 0);
renderer.shadowMap.enabled = true;

const lightA = new THREE.DirectionalLight(0xffffff, 1.2);
lightA.position.set(-449, 160, 1500);
lightA.target.position.set(-449, 160, 1500);
//lightA.target.position.set(-800, 0, 1000)
scene.add(lightA);
const lightB = new THREE.DirectionalLight(0xffffff, 1.2);
lightB.position.set(-400, 815, -400);
lightB.target.position.set(-400, 815, -400);
//lightB.target.position.set(-800, 0, 1000)
scene.add(lightB);
const lightC = new THREE.DirectionalLight(0xffffff, 1.2);
scene.add(lightC);

//const light = new THREE.PointLight( 0xFFFFFF, 2, 0, 0);
//light.position.set(-800, 400, 1000)
//scene.add( light );

const GROUP_NAMES = ["COLLECT", "INVISIBLE"];

const textureLoader = new THREE.TextureLoader();

class Stage {
    constructor(id, name, modelPath, scene) {
        this.id = id;
        this.name = name;
        this.model = null;

        // main
        this.areaNumbers = new THREE.Group();
        this.endemic = new THREE.Group();
        this.labels = new THREE.Group();
        this.gimmicks = [];

        this.categories = new Map();
        this.categoryToggles = new Map();
        this.weatherCategories = new Set();
        this.weatherCategories.add("FERTILITY");
        this.weatherCategories.add("RUIN");
        this.weatherCategories.add("ABNORMAL");

        //weather
        this.fertility = [];
        this.ruin = [];
        this.abnormal = [];

        this.collectables = [];
        this.environment = [];
        this.hidden = [];
        this.nonFiltering = [];
        this.slinger = [];
        this.allCategory = [];

        //stages
        this.stages = new Map();
        STAGES.forEach((stid) => {
            this.stages.set(stid, []);
            //this.categories.set(stid, []);
        });

        this.categories.set("COLLECT", this.collectables);
        this.categories.set("ENVIRONMENT_TRAP", this.environment);
        this.categories.set("INVISIBLE", this.hidden);
        this.categories.set("INVISIBLE_BEACON", this.hidden);
        this.categories.set("NON_FILTERING_TARGET", this.nonFiltering);
        this.categories.set("ALL", this.allCategory);
        this.categories.set("SLINGER", this.slinger);
        this.categories.set("FERTILITY", this.fertility);
        this.categories.set("RUIN", this.ruin);
        this.categories.set("ABNORMAL", this.abnormal);

        this.categoryToggles.set(
            "COLLECT",
            document.getElementById("collectable")
        );
        this.categoryToggles.set(
            "ENVIRONMENT_TRAP",
            document.getElementById("trap")
        );
        this.categoryToggles.set(
            "INVISIBLE",
            document.getElementById("hidden")
        );
        this.categoryToggles.set(
            "INVISIBLE_BEACON",
            document.getElementById("hidden")
        );
        this.categoryToggles.set(
            "NON_FILTERING_TARGET",
            document.getElementById("non-filtering")
        );
        //this.categoryToggles.set('ALL', document.getElementById('all-category'));
        this.categoryToggles.set("SLINGER", document.getElementById("slinger"));
        this.categoryToggles.set(
            "FERTILITY",
            document.getElementById("fertility")
        );
        this.categoryToggles.set("RUIN", document.getElementById("ruin"));
        this.categoryToggles.set(
            "ABNORMAL",
            document.getElementById("abnormal")
        );

        // stages

        const mapNormal = textureLoader.load("./assets/normalv2.png");
        mapNormal.wrapS = THREE.RepeatWrapping;
        mapNormal.wrapT = THREE.RepeatWrapping;
        const mapDiffuse = textureLoader.load("./assets/maindiffuse.png");
        const mapMaterial = new THREE.MeshStandardMaterial({
            map: mapDiffuse,
            normalMap: mapNormal,
        });

        const mapDiffuseWater = textureLoader.load(
            "./assets/mainotherdiffuse.png"
        );
        mapDiffuseWater.wrapS = THREE.RepeatWrapping;
        mapDiffuseWater.wrapT = THREE.RepeatWrapping;
        const mapMaterialWater = new THREE.MeshStandardMaterial({
            map: mapDiffuseWater,
            normalMap: mapNormal,
        });

        const mapTexMainOther01 = textureLoader.load(
            "./assets/mainOther01Diffuse.png"
        );
        mapTexMainOther01.wrapS = THREE.RepeatWrapping;
        mapTexMainOther01.wrapT = THREE.RepeatWrapping;
        const mapMainOther01 = new THREE.MeshStandardMaterial({
            map: mapTexMainOther01,
            normalMap: mapNormal,
        });

        const mapTexMainOther02 = textureLoader.load(
            "./assets/mainOther02Diffuse.png"
        );
        mapTexMainOther02.wrapS = THREE.RepeatWrapping;
        mapTexMainOther02.wrapT = THREE.RepeatWrapping;
        const mapMainOther02 = new THREE.MeshStandardMaterial({
            map: mapTexMainOther02,
            normalMap: mapNormal,
        });

        const mapDiffuseWall = textureLoader.load("./assets/walldiffuse.png");
        const mapMaterialWall = new THREE.MeshStandardMaterial({
            map: mapDiffuseWall,
        });

        const mapDiffuseOutline = textureLoader.load(
            "./assets/outlinediffuse.png"
        );
        const mapMaterialOutline = new THREE.MeshBasicMaterial({
            map: mapDiffuseOutline,
        });
        const loader = new GLTFLoader();
        loader.load(
            modelPath,
            function (model) {
                model.scene.traverse((child) => {
                    child.castShadow = true;
                    if (child.isMesh) {
                        if (child.name.includes("mainOther00")) {
                            child.material = mapMaterialWater;
                        } else if (child.name.includes("mainOther01")) {
                            child.material = mapMainOther01;
                        } else if (child.name.includes("mainOther02")) {
                            child.material = mapMainOther02;
                        } else if (child.name.includes("outline")) {
                            child.material = mapMaterialOutline;
                        } else if (child.name.includes("wall")) {
                            child.material = mapMaterialWall;
                        }
                        if (
                            child.name.includes("main") &&
                            !child.name.includes("Other")
                        ) {
                            child.material = mapMaterial;
                        }
                    } else {
                        child = null;
                    }
                });
                scene.add(model.scene);
                this.model = model.scene;
            }.bind(this),
            undefined,
            function (error) {
                console.error(error);
            }
        );
    }
}

const gimmicks = new Map();
function loadGimmicks() {
    Object.entries(gimmick_data).forEach(([key, value]) => {
        var path = "";
        if (value.map_icon != "INVALID") {
            path = "./assets/item_icons/MHWilds-" + key + " Map Icon.png";
        } else {
            path =
                "./assets/item_icons/MHWilds-" +
                value.icon +
                " Icon " +
                value.color +
                ".png";
        }
        const texture = textureLoader.load(path);
        gimmicks.set(key, {
            data: value,
            texture: texture,
        });
    });
}
loadGimmicks();

const endemics = new Map();
function loadEndemic() {
    Object.entries(endemic_data).forEach(([key, value]) => {
        var path = "";
        if (value.map_icon != "INVALID") {
            path = "./assets/enemy_icons/MHWilds-" + key + " Map Icon.png";
        } else {
            path = "./assets/enemy_icons/MHWilds-" + key + " Icon.png";
        }
        const texture = textureLoader.load(path);
        endemics.set(key, {
            data: value,
            texture: texture,
        });
    });
}
loadEndemic();

const areaNumbers = new Map();
function loadAreaNumbers() {
    Object.entries(map_area_data).forEach(([key, value]) => {
        Object.entries(value).forEach(([area_num, point]) => {
            const path = "./assets/map_nums/" + area_num + ".png";
            const texture = textureLoader.load(path);
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
                texture: texture,
            });
        });
    });
}
loadAreaNumbers();

const labelPoints = new Map();
function loadLabelPoints() {
    Object.entries(map_label_data).forEach(([label_name, point]) => {
        const path = "./assets/map_labels/" + label_name + ".png";
        const texture = textureLoader.load(path);

        // Ensure texture doesn't get resized or cropped
        texture.matrixAutoUpdate = true;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        const name = `${MAP_NAMES.get(label_name)} label`;
        labelPoints.set(label_name, {
            data: {
                point: point,
                name: name,
            },
            texture: texture,
            aspectRatio: 1, // Default, will be updated when image loads
            originalWidth: 100,
            originalHeight: 100,
        });

        // Create an image to get the original dimensions
        const img = new Image();
        img.onload = function () {
            const aspectRatio = img.width / img.height;
            // Store the aspect ratio for later use
            if (labelPoints.has(label_name)) {
                const labelPoint = labelPoints.get(label_name);
                labelPoint.aspectRatio = aspectRatio;
                labelPoint.originalWidth = img.width;
                labelPoint.originalHeight = img.height;

                // If sprite already exists, update its aspect ratio
                sprites.forEach((sprite) => {
                    if (sprite.labelId === label_name) {
                        sprite.aspectRatio = aspectRatio;
                        // Update scale immediately
                        const baseSize = 40; // Larger base size
                        const width = baseSize * aspectRatio;
                        const height = baseSize;
                        sprite.scale.set(width, height, 1);
                    }
                });
            }
        };
        img.src = path;
    });
}
loadLabelPoints();

const st101 = new Stage("st101", "Windward Plains", "./assets/map.glb", scene);
const sprites = [];
gimmicks.forEach((value, key) => {
    value.data.points.forEach((point) => {
        if (point !== undefined) {
            const spriteMaterial = new THREE.SpriteMaterial({
                map: value.texture,
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(25, 25, 25);
            sprite.position.set(point[0], point[1] + 5, point[2]);
            sprite.gimmickId = key;
            sprite.baseScaling = 1.0;
            if (value.data.map_filtering_type === "NON_FILTERING_TARGET") {
                sprite.baseScaling = 1.5;
                sprite.position.set(point[0], point[1] + 10, point[2]);
            }
            if (value.data.map_filtering_type !== null) {
                st101.categories
                    .get(value.data.map_filtering_type)
                    .push(sprite);
            } else {
                st101.categories.get("INVISIBLE").push(sprite);
            }
            const weather = value.data.weather_environments;
            if (weather !== undefined) {
                weather.forEach((w) => st101.categories.get(w).push(sprite));
            }

            sprite.type = "GIMMICK";
            sprites.push(sprite);
            st101.gimmicks.push(sprite);
            scene.add(sprite);
        }
    });
});

endemics.forEach((value, key) => {
    STAGES.forEach((stid) => {
        if (value.data[stid] !== undefined) {
            value.data[stid].points.forEach((point) => {
                if (point != undefined) {
                    const spriteMaterial = new THREE.SpriteMaterial({
                        map: value.texture,
                    });
                    const sprite = new THREE.Sprite(spriteMaterial);
                    sprite.scale.set(25, 25, 25);
                    sprite.position.set(point[0], point[1] + 5, point[2]);
                    sprite.emId = key;
                    sprite.stageId = stid;
                    sprite.type = "ENDEMIC";
                    sprite.baseScaling = 1.0;
                    sprites.push(sprite);
                    st101.endemic.add(sprite);
                }
            });
        }
    });
});

areaNumbers.forEach((value, key) => {
    const spriteMaterial = new THREE.SpriteMaterial({ map: value.texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    const point = value.data.point;
    sprite.scale.set(20, 20, 20);
    sprite.position.set(point[0], point[1] + 20, point[2]);
    sprite.areaId = key;
    sprite.type = "AREA_NUMBER";
    sprite.baseScaling = 1.0;
    sprites.push(sprite);
    st101.areaNumbers.add(sprite);
});

labelPoints.forEach((value, key) => {
    const spriteMaterial = new THREE.SpriteMaterial({
        map: value.texture,
        sizeAttenuation: true, // Ensure size is affected by distance
    });
    const sprite = new THREE.Sprite(spriteMaterial);

    const baseSize = 40;
    const width = baseSize * value.aspectRatio;
    const height = baseSize;

    sprite.scale.set(width, height, 1);
    sprite.position.set(
        value.data.point[0],
        value.data.point[1] + 20,
        value.data.point[2]
    );
    sprite.labelId = key;
    sprite.type = "AREA_LABEL";
    sprite.baseScaling = 1;
    sprite.aspectRatio = value.aspectRatio;
    sprites.push(sprite);
    st101.labels.add(sprite);
});

scene.add(st101.areaNumbers);
scene.add(st101.endemic);
scene.add(st101.labels);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredSprite = null;
let selectedSprite = null;

const tooltip = document.createElement("div");
tooltip.classList.add("tooltip");
document.body.appendChild(tooltip);

let area_langs = {
    Japanese: "Area",
    English: "Area",
    French: "Zone",
    Italian: "Area",
    German: "Area",
    Spanish: "Area",
    Russian: "Area",
    Polish: "Area",
    PortugueseBr: "Area",
    Korean: "Area",
    TransitionalChinese: "区域 ",
    SimplelifiedChinese: "区域 ",
    Arabic: "Area",
    LatinAmericanSpanish: "Area",
    Thai: "พื้นที่",
};

let lang = getQueryParam("lang") || "English";
const displayVersion = getQueryParam("version");

if (displayVersion == "false") {
    document.getElementById("site-info").style.display = "none";
}

// Create language dropdown options
const languageDropdown = document.getElementById("language");

// Set the selected language in the dropdown
const langIndex = Array.from(languageDropdown.options).findIndex(
    (option) => option.value === lang
);
if (langIndex !== -1) {
    languageDropdown.selectedIndex = langIndex;
}

document.getElementById("language").addEventListener("change", function () {
    lang = this.value;
    if (selectedSprite !== null)
        setInfo(selectedItem, selectedSprite, "EXTENDED");
});

function setInfo(element, sprite, info_type) {
    element.innerHTML = "";
    if (sprite.type === "GIMMICK") {
        const gimmick = gimmicks.get(sprite.gimmickId);
        if (gimmick.data.name_langs !== null)
            element.innerHTML = ` <div style="font-weight: bold; color: lightgray;">${gimmick.data.name_langs[lang]}</div> `;
        if (gimmick.data.explain_langs !== null)
            element.innerHTML += `<div>${gimmick.data.explain_langs[lang]}</div>`;
        //element.innerHTML += `<div>${sprite.gimmickId}</div>`;
    } else if (sprite.type === "ENDEMIC") {
        const endemic = endemics.get(sprite.emId);
        if (endemic.data.name_langs !== null)
            element.innerHTML = ` <div style="font-weight: bold; color: lightgray;">${endemic.data.name_langs[lang]}</div> `;
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
        element.innerHTML = `<div style="font-weight: bold; color: lightgray;">${area_langs[lang]} ${num}</div>`;
        //element.innerHTML += `<div>An area in the ${MAP_NAMES.get(st)}</div>`;
    }
    tooltip.style.display = "block";
}

function isVisible(sprite) {
    let result = false;

    switch (sprite.type) {
        case "GIMMICK":
            var data = null;
            data = gimmicks.get(sprite.gimmickId).data;
            if (data.map_filtering_type !== null) {
                result = st101.categoryToggles.get(
                    data.map_filtering_type
                ).checked;
            }
            break;
        case "AREA_NUMBER":
            result = areaNumToggle.checked;
            break;
        case "ENDEMIC":
            result = endemicToggle.checked;
            break;
    }
    return result && sprite.visible;
}

function getFirstIntersectingVisibleSprite(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sprites);
    if (intersects.length > 0) {
        let i = 0;
        while (
            typeof intersects[i] !== "undefined" &&
            (!intersects[i].object.visible || !isVisible(intersects[i].object))
        ) {
            i++;
        }
        if (i >= intersects.length) {
            hoveredSprite = null;
            return false;
        }
        if (hoveredSprite !== intersects[i].object) {
            hoveredSprite = intersects[i].object;
        }
        return true;
    }
    return false;
}

window.addEventListener("mousemove", (event) => {
    const res = getFirstIntersectingVisibleSprite(event);
    if (res) {
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
window.addEventListener("click", (event) => {
    const res = getFirstIntersectingVisibleSprite(event);
    if (res) {
        selectedSprite = hoveredSprite;
        selectedItem.style.display = "flex";
        setInfo(selectedItem, selectedSprite, "EXTENDED");
    }
});

function updateSprites() {
    const distance = Math.min(camera.position.distanceTo(controls.target), 800);
    const scale = Math.max((32.0 * distance) / 700, 10.0);
    sprites.forEach((sprite) => {
        if (sprite.type === "AREA_LABEL") {
            // For label points, maintain aspect ratio with larger scaling
            const s = scale * sprite.baseScaling;
            const width = s * (sprite.aspectRatio || 1);
            const height = s;
            sprite.scale.set(width, height, 1);
        } else {
            // For other sprites, use uniform scaling
            const s = scale * sprite.baseScaling;
            sprite.scale.set(s, s, s);
        }
    });
}

const filters = document.getElementById("filters");
const selectToggle = document.getElementById("selectall");
const deselectToggle = document.getElementById("deselect");
const endemicToggle = document.getElementById("endemic");
const areaNumToggle = document.getElementById("areanumbers");

const searchBar = document.getElementById("search-filter");

function updateSearch() {
    const searchVal = searchBar.value.toLowerCase();
    sprites.forEach((sprite) => {
        var data = null;
        switch (sprite.type) {
            case "GIMMICK":
                data = gimmicks.get(sprite.gimmickId).data;
                break;
            case "AREA_NUMBER":
                data = areaNumbers.get(sprite.areaId).data;
                break;
            case "AREA_LABEL":
                data = labelPoints.get(sprite.labelId).data;
                break;
            case "ENDEMIC":
                data = endemics.get(sprite.emId).data;
                break;
        }
        if (data.name_langs !== null && data.name_langs !== undefined)
            sprite.visible = data.name_langs[lang]
                .toLowerCase()
                .includes(searchVal);
    });
}

function updateToggles() {
    st101.endemic.visible = endemicToggle.checked;
    st101.areaNumbers.visible = areaNumToggle.checked;

    st101.categoryToggles.entries().forEach(([category, toggle]) => {
        if (!st101.weatherCategories.has(category))
            st101.categories
                .get(category)
                .forEach((sprite) => (sprite.visible = toggle.checked));
    });

    st101.gimmicks.forEach((sprite) => {
        const gimmick = gimmicks.get(sprite.gimmickId);
        if (
            gimmick.data.weather_environments !== undefined &&
            !gimmick.data.weather_repop
        ) {
            const envs = gimmick.data.weather_environments;
            if (
                !(
                    ((envs.includes("FERTILITY") &&
                        st101.categoryToggles.get("FERTILITY").checked) ||
                        (envs.includes("RUIN") &&
                            st101.categoryToggles.get("RUIN").checked) ||
                        (envs.includes("ABNORMAL") &&
                            st101.categoryToggles.get("ABNORMAL").checked)) &&
                    sprite.visible
                )
            ) {
                sprite.visible = false;
            }
        }
    });
}

updateSearch();
updateToggles();
function updateFilters(event) {
    if (event !== undefined) {
        if (event.target.classList.contains("search")) {
            updateSearch();
        } else {
            if (!event.target.classList.contains("selectall")) {
                if (selectToggle.checked && !event.target.checked) {
                    selectToggle.checked = false;
                }
            } else {
                if (event.target.checked) {
                    st101.categoryToggles.forEach((toggle) => {
                        toggle.checked = true;
                    });
                    endemicToggle.checked = true;
                    areaNumToggle.checked = true;
                    deselectToggle.checked = false;
                }
            }
            if (!event.target.classList.contains("deselectall")) {
                if (deselectToggle.checked && event.target.checked) {
                    deselectToggle.checked = false;
                }
            } else {
                if (event.target.checked) {
                    st101.categoryToggles.forEach((toggle) => {
                        toggle.checked = false;
                    });
                    endemicToggle.checked = false;
                    areaNumToggle.checked = false;
                    selectToggle.checked = false;
                }
            }
            updateToggles();
        }
    }
}

filters.addEventListener("change", updateFilters);

camera.position.set(-600, 600, 1300);
function initControls(camera) {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enable = true;
    controls.minDistance = 100;
    controls.maxDistance = 2000;
    controls.staticMoving = true;
    controls.zoomSpeed = 1.5;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    controls.target.set(-700, 0, 1400);
    camera.lookAt(controls.target);
    return controls;
}

const controls = initControls(camera);
controls.update();

window.addEventListener("resize", onWindowResize);
function animate() {
    controls.update();
    renderer.clear();
    updateSprites();
    const pos = camera.position;
    document.getElementById(
        "camera-position"
    ).innerText = `xyz (${pos.x.toFixed(0)}, ${pos.y.toFixed(
        0
    )}, ${pos.z.toFixed(0)})`;
    renderer.render(scene, camera);
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

document.querySelectorAll(".toggleButton").forEach((button) => {
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

    // Auto-open the Filters menu by default
    if (button.parentElement.id === "filters") {
        let content = button.nextElementSibling;
        let arrow = button.querySelector(".arrow");
        content.style.maxHeight = content.scrollHeight + "px";
        arrow.textContent = "▼"; // Arrow points down when expanded
    }
});

// Handle Close Menu button
const closeMenuButton = document.querySelector(".close-menu-button");
if (closeMenuButton) {
    closeMenuButton.addEventListener("click", function () {
        const filtersMenu = document.getElementById("filters");
        if (filtersMenu) {
            const isMenuHidden = filtersMenu.style.display === "none";
            filtersMenu.style.display = isMenuHidden ? "flex" : "none";

            // Toggle button text and class
            this.textContent = isMenuHidden ? "Close Menu" : "Open Menu";

            if (isMenuHidden) {
                this.classList.remove("menu-closed");
            } else {
                this.classList.add("menu-closed");
            }
        }
    });
}

// Update map title based on selected map
const mapDropdown = document.querySelector(".map-dropdown");
const mapTitle = document.getElementById("map-title");
if (mapDropdown && mapTitle) {
    mapDropdown.addEventListener("change", function () {
        const selectedOption = this.options[this.selectedIndex];
        mapTitle.textContent = selectedOption.textContent;

        // You may want to add code here to load the selected map
        // For example: loadMap(this.value);
    });
}

// Handle the toggle all button
const toggleAllButton = document.getElementById("toggle-all-button");
const selectAllCheckbox = document.getElementById("selectall");
const deselectAllCheckbox = document.getElementById("deselect");

if (toggleAllButton) {
    let selectMode = true; // Start in select mode

    toggleAllButton.addEventListener("click", function () {
        selectMode = !selectMode;

        if (selectMode) {
            // Select All mode
            toggleAllButton.textContent = "Deselect All";
            toggleAllButton.classList.add("deselect-mode");
            selectAllCheckbox.checked = true;
            deselectAllCheckbox.checked = false;

            // Trigger the change event on selectAllCheckbox
            const event = new Event("change", { bubbles: true });
            selectAllCheckbox.dispatchEvent(event);
        } else {
            // Deselect All mode
            toggleAllButton.textContent = "Select All";
            toggleAllButton.classList.remove("deselect-mode");
            selectAllCheckbox.checked = false;
            deselectAllCheckbox.checked = true;

            // Trigger the change event on deselectAllCheckbox
            const event = new Event("change", { bubbles: true });
            deselectAllCheckbox.dispatchEvent(event);
        }
    });
}

// Ensure the foldable content has the right height
document.addEventListener("DOMContentLoaded", function () {
    const foldableElements = document.querySelectorAll(".foldable");
    foldableElements.forEach(function (element) {
        if (element.parentElement.id === "filters") {
            element.style.maxHeight = element.scrollHeight + "px";
        }
    });

    // Initialize toggle button state based on checkboxes
    const toggleAllButton = document.getElementById("toggle-all-button");
    const selectAllCheckbox = document.getElementById("selectall");
    const deselectAllCheckbox = document.getElementById("deselect");

    if (toggleAllButton && selectAllCheckbox && deselectAllCheckbox) {
        if (!deselectAllCheckbox.checked) {
            toggleAllButton.textContent = "Deselect All";
            toggleAllButton.classList.add("deselect-mode");
        } else {
            toggleAllButton.textContent = "Select All";
            toggleAllButton.classList.remove("deselect-mode");
        }

        // Trigger the appropriate event to ensure filters are updated
        if (deselectAllCheckbox.checked) {
            const event = new Event("change", { bubbles: true });
            deselectAllCheckbox.dispatchEvent(event);
        }
    }

    // Initialize Close Menu button state
    const closeMenuButton = document.querySelector(".close-menu-button");
    const filtersMenu = document.getElementById("filters");

    if (closeMenuButton && filtersMenu) {
        // Check if menu is initially hidden
        if (filtersMenu.style.display === "none") {
            closeMenuButton.textContent = "Open Menu";
            closeMenuButton.classList.add("menu-closed");
        } else {
            closeMenuButton.textContent = "Close Menu";
            closeMenuButton.classList.remove("menu-closed");
        }
    }
});
