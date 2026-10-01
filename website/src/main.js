import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const models = [
  { name: 'Pablo Vives', file: 'Vives_Pablo_48116412.fbx', url: new URL('../../Assets/Vives_Pablo_48116412.fbx', import.meta.url).href },
  { name: 'Gael Moszenberg', file: 'Moszenberg_Gael_48242494.fbx', url: new URL('../../Assets/Moszenberg_Gael_48242494.fbx', import.meta.url).href },
  { name: 'Manuel Corsunsky Gayá', file: 'Corsunsky Gayá_Manuel_48592035.fbx', url: new URL('../../Assets/Corsunsky Gayá_Manuel_48592035.fbx', import.meta.url).href },
  { name: 'Elian Matias Engelberg', file: 'Engelberg_Elian Matias_48366467.fbx', url: new URL('../../Assets/Engelberg_Elian Matias_48366467.fbx', import.meta.url).href, previewScale: 1.55 }
]

const canvas = document.querySelector('#model-canvas')
const stage = document.querySelector('#stage')
const modelName = document.querySelector('#model-name')
const modelCount = document.querySelector('#model-count')
const stageNumber = document.querySelector('#stage-number')
const selector = document.querySelector('#model-selector')
const loadStatus = document.querySelector('#load-status')
const loadingIndicator = document.querySelector('#stage-loading')
const errorMessage = document.querySelector('#stage-error')

const scene = new THREE.Scene()
scene.background = new THREE.Color('#07101d')

const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 1000)
camera.position.set(0, 0.15, 5.8)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15

scene.add(new THREE.HemisphereLight(0xd7f5ff, 0x11182b, 2.7))
const keyLight = new THREE.DirectionalLight(0xeafaff, 3.1)
keyLight.position.set(3, 5, 4)
scene.add(keyLight)
const fillLight = new THREE.DirectionalLight(0x38cfff, 1.8)
fillLight.position.set(-4, 1, -3)
scene.add(fillLight)
const rimLight = new THREE.PointLight(0x245dff, 1.4, 12)
rimLight.position.set(1, -2, 4)
scene.add(rimLight)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.enablePan = false
controls.minDistance = 2.2
controls.maxDistance = 9
controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
controls.autoRotateSpeed = 1.1
controls.target.set(0, 0, 0)

const modelGroup = new THREE.Group()
scene.add(modelGroup)

const loaderManager = new THREE.LoadingManager()
const fallbackPalette = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#c3c9c0"/></svg>')}`
loaderManager.setURLModifier((url) => url.includes('endesga-32-32x.png') ? fallbackPalette : url)
const loader = new FBXLoader(loaderManager)
const loadedModels = new Map()
const previewRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' })
previewRenderer.setPixelRatio(1)
previewRenderer.setSize(196, 132, false)
previewRenderer.setClearColor(0x000000, 0)
previewRenderer.outputColorSpace = THREE.SRGBColorSpace
previewRenderer.toneMapping = THREE.ACESFilmicToneMapping
const previewScene = new THREE.Scene()
previewScene.add(new THREE.HemisphereLight(0xd7f5ff, 0x11182b, 2.5))
const previewKeyLight = new THREE.DirectionalLight(0xeafaff, 3)
previewKeyLight.position.set(3, 5, 4)
previewScene.add(previewKeyLight)
const previewFillLight = new THREE.DirectionalLight(0x38cfff, 1.7)
previewFillLight.position.set(-4, 1, -3)
previewScene.add(previewFillLight)
const previewCamera = new THREE.PerspectiveCamera(32, 196 / 132, 0.01, 1000)
previewCamera.position.set(0, 0.1, 4.4)
previewCamera.lookAt(0, 0, 0)
let selectedIndex = 0
let selectionRequest = 0
let currentObject = null

function resizeRenderer() {
  const { width, height } = stage.getBoundingClientRect()
  if (!width || !height) return
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

new ResizeObserver(resizeRenderer).observe(stage)
resizeRenderer()

function prepareModel(object) {
  const bounds = new THREE.Box3().setFromObject(object)
  const dimensions = bounds.getSize(new THREE.Vector3())
  const largestDimension = Math.max(dimensions.x, dimensions.y, dimensions.z)

  if (largestDimension > 0) object.scale.multiplyScalar(2.45 / largestDimension)
  object.position.sub(new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()))

  object.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = true
    child.receiveShadow = true
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => { material.side = THREE.DoubleSide })
    } else if (child.material) {
      child.material.side = THREE.DoubleSide
    }
  })

  return object
}

function renderSelector() {
  if (!selector.childElementCount) {
    selector.replaceChildren(...models.map((model, index) => {
      const button = document.createElement('button')
      button.className = 'model-option'
      button.type = 'button'
      button.setAttribute('aria-label', `Ver modelo de ${model.name}`)
      button.innerHTML = `<span class="option-number">0${index + 1}</span><canvas class="option-preview" width="168" height="112" aria-hidden="true"></canvas><span class="option-copy"><span class="option-name">${model.name}</span><span class="option-subtitle">MODELO BLENDER</span></span><span class="option-mark" aria-hidden="true"></span>`
      button.addEventListener('click', () => selectModel(index))
      renderModelPreview(model, button.querySelector('canvas'))
      return button
    }))
  }

  selector.querySelectorAll('.model-option').forEach((button, index) => {
    button.setAttribute('aria-current', index === selectedIndex ? 'true' : 'false')
  })
}

async function loadModel(model) {
  if (!loadedModels.has(model.url)) {
    const request = loader.loadAsync(model.url).then(prepareModel)
    loadedModels.set(model.url, request)
    request.catch(() => loadedModels.delete(model.url))
  }
  return loadedModels.get(model.url)
}

async function renderModelPreview(model, thumbnail) {
  try {
    const object = await loadModel(model)
    if (!thumbnail.isConnected) return

    const previewObject = object.clone(true)
    previewObject.scale.multiplyScalar(model.previewScale ?? 1)
    previewObject.traverse((child) => {
      if (!child.isMesh) return
      const applyPreviewMaterial = (material) => {
        const previewMaterial = material.clone()
        previewMaterial.color.set('#91eaff')
        if (previewMaterial.emissive) {
          previewMaterial.emissive.set('#075b90')
          previewMaterial.emissiveIntensity = 0.5
        }
        return previewMaterial
      }
      child.material = Array.isArray(child.material)
        ? child.material.map(applyPreviewMaterial)
        : applyPreviewMaterial(child.material)
    })

    const thumbnailContext = thumbnail.getContext('2d', { willReadFrequently: true })
    const horizontalAngles = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4]
    const verticalAngles = [0, Math.PI / 4, -Math.PI / 4]
    const rollAngles = [0, Math.PI / 4, Math.PI / 2, -Math.PI / 4]
    let bestFrame = null
    let bestFit = 0

    for (const verticalAngle of verticalAngles) {
      for (const horizontalAngle of horizontalAngles) {
        for (const rollAngle of rollAngles) {
          previewObject.rotation.set(verticalAngle, horizontalAngle, rollAngle)
          previewScene.add(previewObject)
          previewRenderer.render(previewScene, previewCamera)
          thumbnailContext.clearRect(0, 0, thumbnail.width, thumbnail.height)
          thumbnailContext.drawImage(previewRenderer.domElement, 0, 0, thumbnail.width, thumbnail.height)
          const frame = thumbnailContext.getImageData(0, 0, thumbnail.width, thumbnail.height)
          let minX = thumbnail.width
          let minY = thumbnail.height
          let maxX = -1
          let maxY = -1
          for (let y = 0; y < thumbnail.height; y += 1) {
            for (let x = 0; x < thumbnail.width; x += 1) {
              if (frame.data[(y * thumbnail.width + x) * 4 + 3] <= 12) continue
              minX = Math.min(minX, x)
              minY = Math.min(minY, y)
              maxX = Math.max(maxX, x)
              maxY = Math.max(maxY, y)
            }
          }
          const fit = maxX < 0 ? 0 : Math.min((maxX - minX + 1) / thumbnail.width, (maxY - minY + 1) / thumbnail.height)
          if (fit > bestFit) {
            bestFit = fit
            bestFrame = frame
          }
          previewScene.remove(previewObject)
        }
      }
    }

    if (bestFrame) thumbnailContext.putImageData(bestFrame, 0, 0)
    thumbnail.classList.add('is-ready')
  } catch {
    thumbnail.closest('.model-option').classList.add('preview-failed')
  }
}

async function selectModel(index) {
  selectedIndex = (index + models.length) % models.length
  const request = ++selectionRequest
  const model = models[selectedIndex]
  const formattedIndex = String(selectedIndex + 1).padStart(2, '0')

  stage.classList.add('is-loading')
  modelName.textContent = model.name
  modelCount.innerHTML = `${formattedIndex} <span>/ 04</span>`
  stageNumber.textContent = formattedIndex
  loadStatus.textContent = `ARCHIVO · ${model.file}`
  errorMessage.hidden = true
  loadingIndicator.hidden = false
  renderSelector()

  try {
    const object = await loadModel(model)
    if (request !== selectionRequest) return

    if (currentObject) modelGroup.remove(currentObject)
    currentObject = object
    modelGroup.add(currentObject)
    stage.classList.remove('is-loading')
    loadingIndicator.hidden = true
    loadStatus.textContent = `ARCHIVO · ${model.file}`
    controls.reset()
  } catch (error) {
    if (request !== selectionRequest) return
    console.error(`Could not load ${model.file}`, error)
    stage.classList.remove('is-loading')
    loadingIndicator.hidden = true
    errorMessage.hidden = false
    loadStatus.textContent = 'ERROR DE CARGA'
  }
}

document.querySelector('#previous-model').addEventListener('click', () => selectModel(selectedIndex - 1))
document.querySelector('#next-model').addEventListener('click', () => selectModel(selectedIndex + 1))
document.querySelector('#reset-view').addEventListener('click', () => controls.reset())

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') selectModel(selectedIndex + 1)
  if (event.key === 'ArrowLeft') selectModel(selectedIndex - 1)
})

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

renderSelector()
selectModel(0)
animate()