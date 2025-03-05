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

// Check for WebGL compatibility, especially for iOS Safari
function isWebGLAvailable() {
    try {
        const canvas = document.createElement("canvas");
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext("webgl") ||
                canvas.getContext("experimental-webgl"))
        );
    } catch (e) {
        return false;
    }
}

// Create renderer with proper settings for iOS Safari
let renderer;
try {
    // Try to create renderer with more compatible settings
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: "default",
        failIfMajorPerformanceCaveat: false,
    });

    // Set pixel ratio with a maximum to prevent performance issues on high-DPI iOS devices
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);

    // Check if we're on iOS
    const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
        console.log("iOS device detected, applying special rendering settings");
        // iOS-specific optimizations
        renderer.shadowMap.enabled = false; // Disable shadows for better performance
        renderer.outputEncoding = THREE.sRGBEncoding; // Better color handling for iOS
    } else {
        renderer.shadowMap.enabled = true;
    }
} catch (e) {
    console.error("WebGL renderer creation failed:", e);
    // Fallback message for users
    const errorMsg = document.createElement("div");
    errorMsg.style.position = "absolute";
    errorMsg.style.top = "50%";
    errorMsg.style.left = "50%";
    errorMsg.style.transform = "translate(-50%, -50%)";
    errorMsg.style.color = "#e8b53a";
    errorMsg.style.fontFamily = "sans-serif";
    errorMsg.style.textAlign = "center";
    errorMsg.style.padding = "20px";
    errorMsg.style.backgroundColor = "rgba(0,0,0,0.7)";
    errorMsg.style.borderRadius = "10px";
    errorMsg.innerHTML =
        "<h2>WebGL Not Available</h2><p>Your browser does not support WebGL or it is disabled. Please try a different browser or enable WebGL in your settings.</p>";
    document.body.appendChild(errorMsg);

    // Create a minimal renderer to prevent further errors
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
}

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.setClearColor(0xffffff, 0);

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

// Add a loading manager to handle loading progress and errors
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    //console.log(`Loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
};
loadingManager.onError = function (url) {
    console.error(`Error loading: ${url}`);
};

// Create a loading indicator
const loadingIndicator = document.createElement("div");
loadingIndicator.style.position = "absolute";
loadingIndicator.style.top = "50%";
loadingIndicator.style.left = "50%";
loadingIndicator.style.transform = "translate(-50%, -50%)";
loadingIndicator.style.color = "#e8b53a";
loadingIndicator.style.fontFamily = "sans-serif";
loadingIndicator.style.textAlign = "center";
loadingIndicator.style.padding = "20px";
loadingIndicator.style.backgroundColor = "rgba(0,0,0,0.7)";
loadingIndicator.style.borderRadius = "10px";
loadingIndicator.style.zIndex = "1000";
loadingIndicator.innerHTML =
    "<h2>Loading Map...</h2><p>Please wait while the map loads.</p>";
document.body.appendChild(loadingIndicator);

loadingManager.onLoad = function () {
    // Hide loading indicator when all resources are loaded
    loadingIndicator.style.display = "none";
};

// Use the loading manager for all texture loaders
const textureLoader = new THREE.TextureLoader(loadingManager);

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

        // Use the loading manager for GLTF loader
        const loader = new GLTFLoader(loadingManager);

        // Add a timeout to detect stalled loads (common issue on iOS Safari)
        const loadTimeout = setTimeout(() => {
            console.warn("Model loading timeout - attempting to recover");
            // Try to force a renderer update
            renderer.render(scene, camera);
        }, 10000); // 10 second timeout

        loader.load(
            modelPath,
            function (model) {
                clearTimeout(loadTimeout); // Clear the timeout on successful load

                // iOS Safari specific optimizations
                const isIOS =
                    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
                    !window.MSStream;

                model.scene.traverse((child) => {
                    child.castShadow = isIOS ? false : true; // Disable shadows on iOS

                    if (child.isMesh) {
                        // Optimize materials for iOS
                        if (isIOS) {
                            // Use simpler materials on iOS
                            child.material.flatShading = true;
                            child.material.needsUpdate = true;
                        }

                        // Apply materials as before
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

                // Force a render update after adding the model
                renderer.render(scene, camera);
            }.bind(this),
            // Progress callback
            function (xhr) {
                if (xhr.lengthComputable) {
                    const percentComplete = (xhr.loaded / xhr.total) * 100;
                    loadingIndicator.innerHTML = `<h2>Loading Map...</h2><p>${Math.round(
                        percentComplete
                    )}% loaded</p>`;
                }
            },
            function (error) {
                clearTimeout(loadTimeout); // Clear the timeout on error
                console.error("Error loading model:", error);
                loadingIndicator.innerHTML =
                    "<h2>Error Loading Map</h2><p>There was a problem loading the map. Please try refreshing the page.</p>";
                loadingIndicator.style.display = "block";
            }
        );
    }
}

const st101 = new Stage("st101", "Windward Plains", "./assets/map.glb", scene);
const sprites = [];

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
        const data = value;
        textureLoader.load(path, (texture) => {
            data.points.forEach((point) => {
                if (point !== undefined) {
                    const spriteMaterial = new THREE.SpriteMaterial({
                        map: texture,
                    });
                    const sprite = new THREE.Sprite(spriteMaterial);
                    sprite.position.set(point[0], point[1] + 5, point[2]);
                    sprite.gimmickId = key;
                    sprite.baseScaling = 1.0;
                    sprite.aspectRatio = 1.0;
                    sprite.scale.set(20 * sprite.aspectRatio, 20, 20);
                    if (data.map_filtering_type === "NON_FILTERING_TARGET") {
                        sprite.baseScaling = 1.5;
                        sprite.position.set(point[0], point[1] + 10, point[2]);
                    }
                    if (data.map_filtering_type !== null) {
                        st101.categories
                            .get(data.map_filtering_type)
                            .push(sprite);
                    } else {
                        st101.categories.get("INVISIBLE").push(sprite);
                    }
                    const weather = data.weather_environments;
                    if (weather !== undefined) {
                        weather.forEach((w) =>
                            st101.categories.get(w).push(sprite)
                        );
                    }

                    sprite.type = "GIMMICK";
                    sprites.push(sprite);
                    st101.gimmicks.push(sprite);
                    scene.add(sprite);
                }
            });
        });
        gimmicks.set(key, {
            data: data,
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
        const data = value;
        textureLoader.load(path, (texture) => {
            STAGES.forEach((stid) => {
                if (data[stid] !== undefined) {
                    data[stid].points.forEach((point) => {
                        if (point != undefined) {
                            const spriteMaterial = new THREE.SpriteMaterial({
                                map: texture,
                            });
                            const sprite = new THREE.Sprite(spriteMaterial);
                            const width = spriteMaterial.map.image.width;
                            const height = spriteMaterial.map.image.height;
                            sprite.aspectRatio = width / height;
                            sprite.scale.set(20 * sprite.aspectRatio, 20, 20);
                            sprite.position.set(
                                point[0],
                                point[1] + 5,
                                point[2]
                            );
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
        endemics.set(key, {
            data: data,
        });
    });
}
loadEndemic();

const areaNumbers = new Map();
function loadAreaNumbers() {
    Object.entries(map_area_data).forEach(([key, value]) => {
        Object.entries(value).forEach(([area_num, point]) => {
            const area = area_num.split("_");
            const st = area[0];
            const num = area[1];
            const name = `${MAP_NAMES.get(st)} ${num}`;
            const data = {
                point: point,
                areaNum: area_num,
                name: name,
            };
            areaNumbers.set(area_num, {
                data: data,
            });
            const path = "./assets/map_nums/" + area_num + ".png";
            textureLoader.load(path, (texture) => {
                const spriteMaterial = new THREE.SpriteMaterial({
                    map: texture,
                });
                const sprite = new THREE.Sprite(spriteMaterial);
                const point = data.point;
                sprite.aspectRatio = texture.image.width / texture.image.height;
                sprite.scale.set(20 * sprite.aspectRatio, 20, 20);
                sprite.position.set(point[0], point[1] + 20, point[2]);
                sprite.stageId = key;
                sprite.areaId = area_num;
                sprite.type = "AREA_NUMBER";
                sprite.baseScaling = 1.0;
                sprites.push(sprite);
                st101.areaNumbers.add(sprite);
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

let lang = getQueryParam("lang") || "Thai";
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
    // Calculate distance from camera to target
    const distance = camera.position.distanceTo(controls.target);

    // Create a more responsive scaling formula
    // This will make sprites maintain a more consistent screen size regardless of zoom level
    // Min distance is set in controls (10), max is 1500
    // Map this range to a scale range
    const normalizedDistance = Math.max(
        0,
        Math.min(1, (distance - 10) / (controls.maxDistance - 10))
    );

    // Use an inverse relationship - closer = smaller sprites, further = larger sprites
    // This creates a more natural feel when zooming
    // Increased by 20% from previous values (10 → 12, 30 → 36)
    const baseScale = 12 + 36 * normalizedDistance;

    sprites.forEach((sprite) => {
        if (sprite.type === "AREA_LABEL") {
            // For label points, maintain aspect ratio with larger scaling
            const s = baseScale * sprite.baseScaling;
            const width = s * (sprite.aspectRatio || 1);
            const height = s;
            sprite.scale.set(width, height, 1);
        } else {
            // For other sprites, use uniform scaling
            const s = baseScale * sprite.baseScaling;
            sprite.scale.set(s * sprite.aspectRatio, s, 1);
        }
    });
}

const filters = document.getElementById("filters");
const endemicToggle = document.getElementById("endemic");
const areaNumToggle = document.getElementById("areanumbers");

const searchBar = document.getElementById("search-filter");
const suggestionsContainer = document.getElementById("search-suggestions");

// Function to get all searchable items
function getAllSearchableItems() {
    const items = [];

    // Add gimmicks
    const addedNames = new Set();
    gimmicks.forEach((gimmick) => {
        if (gimmick.data.name_langs && gimmick.data.name_langs[lang]) {
            const name = gimmick.data.name_langs[lang];
            if (!addedNames.has(name)) {
                items.push({
                    name: name,
                    type: "GIMMICK",
                });
                addedNames.add(name);
            }
        }
    });

    // Add endemics
    endemics.forEach((endemic) => {
        if (endemic.data.name_langs && endemic.data.name_langs[lang]) {
            const name = endemic.data.name_langs[lang];
            if (!addedNames.has(name)) {
                items.push({
                    name: name,
                    type: "ENDEMIC",
                });
                addedNames.add(name);
            }
        }
    });

    return items;
}

// Function to update search suggestions
function updateSearchSuggestions() {
    const searchVal = searchBar.value.toLowerCase().trim();
    suggestionsContainer.innerHTML = "";

    if (searchVal.length < 1) {
        suggestionsContainer.style.display = "none";
        return;
    }

    const items = getAllSearchableItems();
    const matchingItems = items
        .filter((item) => item.name.toLowerCase().includes(searchVal))
        .slice(0, 10); // Limit to 10 suggestions

    if (matchingItems.length === 0) {
        suggestionsContainer.style.display = "none";
        return;
    }

    matchingItems.forEach((item) => {
        const suggestionItem = document.createElement("div");
        suggestionItem.className = "search-suggestion-item";
        suggestionItem.textContent = item.name;

        suggestionItem.addEventListener("click", () => {
            searchBar.value = item.name;
            suggestionsContainer.style.display = "none";
            updateSearch(); // Update the search with the selected suggestion
        });

        suggestionsContainer.appendChild(suggestionItem);
    });

    suggestionsContainer.style.display = "block";
}

// Add event listeners for search suggestions
searchBar.addEventListener("input", updateSearchSuggestions);
searchBar.addEventListener("focus", updateSearchSuggestions);

// Close suggestions when clicking outside
document.addEventListener("click", (event) => {
    if (
        !searchBar.contains(event.target) &&
        !suggestionsContainer.contains(event.target)
    ) {
        suggestionsContainer.style.display = "none";
    }
});

// Handle keyboard navigation in suggestions
searchBar.addEventListener("keydown", (event) => {
    const items = suggestionsContainer.querySelectorAll(
        ".search-suggestion-item"
    );
    const activeItem = suggestionsContainer.querySelector(
        ".search-suggestion-item.active"
    );

    if (items.length === 0) return;

    if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!activeItem) {
            items[0].classList.add("active");
        } else {
            const nextIndex = Array.from(items).indexOf(activeItem) + 1;
            if (nextIndex < items.length) {
                activeItem.classList.remove("active");
                items[nextIndex].classList.add("active");
            }
        }
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!activeItem) {
            items[items.length - 1].classList.add("active");
        } else {
            const prevIndex = Array.from(items).indexOf(activeItem) - 1;
            if (prevIndex >= 0) {
                activeItem.classList.remove("active");
                items[prevIndex].classList.add("active");
            }
        }
    } else if (event.key === "Enter" && activeItem) {
        event.preventDefault();
        searchBar.value = activeItem.textContent;
        suggestionsContainer.style.display = "none";
        updateSearch();
    } else if (event.key === "Escape") {
        suggestionsContainer.style.display = "none";
    }
});

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
}

updateSearch();
updateToggles();
function updateFilters(event) {
    if (event !== undefined) {
        if (event.target.classList.contains("search")) {
            updateSearch();
        } else {
            updateToggles();
        }
    }
}

filters.addEventListener("change", updateFilters);

camera.position.set(-600, 600, 1300);
function initControls(camera) {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enable = true;
    controls.minDistance = 10;
    controls.maxDistance = 1500;
    controls.staticMoving = true;
    controls.zoomSpeed = 1.5;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    controls.target.set(-700, 0, 1400);
    camera.lookAt(controls.target);

    // Implement Google Maps-like touch controls for mobile
    if (window.innerWidth <= 768) {
        // Check if we're on iOS
        const isIOS =
            /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        // Configure touch controls like Google Maps
        controls.touches = {
            ONE: THREE.TOUCH.PAN, // One finger drag to move camera (pan)
            TWO: THREE.TOUCH.DOLLY_ROTATE, // Two finger for zoom and rotate
        };

        // Adjust sensitivity
        controls.rotateSpeed = 0.5; // Slower rotation for more precise control
        controls.panSpeed = 0.7; // Adjust pan speed
        controls.zoomSpeed = isIOS ? 0.8 : 1.2; // Lower zoom speed on iOS for better control

        // Add inertia for smoother movement
        controls.enableDamping = true;
        controls.dampingFactor = isIOS ? 0.05 : 0.1; // Less damping on iOS for more responsive feel

        // Prevent auto-rotation
        controls.autoRotate = false;

        // Limit vertical rotation to prevent disorientation
        controls.minPolarAngle = Math.PI * 0.1; // Limit how high user can orbit
        controls.maxPolarAngle = Math.PI * 0.9; // Limit how low user can orbit

        // Disable right-click context menu on mobile
        renderer.domElement.addEventListener("contextmenu", function (event) {
            event.preventDefault();
        });

        // iOS Safari specific touch event handling
        if (isIOS) {
            console.log("Applying iOS-specific touch controls");

            // Prevent default touch actions to avoid iOS Safari gestures interfering
            document.addEventListener(
                "touchmove",
                function (e) {
                    if (e.touches.length > 1) {
                        e.preventDefault();
                    }
                },
                { passive: false }
            );

            // Ensure controls update even during touch events
            renderer.domElement.addEventListener("touchmove", function () {
                controls.update();
            });

            // Force update after touch end
            renderer.domElement.addEventListener("touchend", function () {
                controls.update();
                renderer.render(scene, camera);
            });
        }
    }

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

// Function to move camera to a specific map label point
function moveCameraToMapPoint(mapId) {
    if (map_label_data[mapId]) {
        const [x, y, z] = map_label_data[mapId];

        // Animate the camera movement
        const startPosition = camera.position.clone();
        const startTarget = controls.target.clone();

        // Calculate the new target position
        const newTarget = new THREE.Vector3(x, y, z);

        // Calculate a position for the camera that's offset from the target
        // This positions the camera at a good viewing angle
        const cameraOffset = new THREE.Vector3(200, 150, 200);
        const newPosition = newTarget.clone().add(cameraOffset);

        // Animation duration in milliseconds
        const duration = 1000;
        const startTime = performance.now();

        function animateCamera(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Use an easing function for smoother animation
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out

            // Interpolate position and target
            camera.position.lerpVectors(
                startPosition,
                newPosition,
                easeProgress
            );
            controls.target.lerpVectors(startTarget, newTarget, easeProgress);

            controls.update();

            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            }
        }

        requestAnimationFrame(animateCamera);
    }
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
            this.textContent = isMenuHidden ? "ปิดเมนู" : "เปิดเมนู";

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

        // Move camera to the selected map's label point
        moveCameraToMapPoint(this.value);
    });

    // Set initial camera position based on the default selected map
    if (mapDropdown.value) {
        moveCameraToMapPoint(mapDropdown.value);
    }
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
            closeMenuButton.textContent = "เปิดเมนู";
            closeMenuButton.classList.add("menu-closed");
        } else {
            closeMenuButton.textContent = "ปิดเมนู";
            closeMenuButton.classList.remove("menu-closed");
        }
    }
});

// Expose camera control functions for mobile touch controls
window.resetCamera = function () {
    // Reset camera to initial position with animation
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const endPosition = new THREE.Vector3(-600, 600, 1300);
    const endTarget = new THREE.Vector3(-700, 0, 1400);

    const duration = 1000; // ms
    const startTime = Date.now();

    function animateReset() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out

        camera.position.lerpVectors(startPosition, endPosition, easeProgress);
        controls.target.lerpVectors(startTarget, endTarget, easeProgress);

        if (progress < 1) {
            requestAnimationFrame(animateReset);
        }
    }

    animateReset();
};
