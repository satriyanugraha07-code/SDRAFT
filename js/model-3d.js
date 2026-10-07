import { publicAssetUrl } from '../src/asset-url.js';
import { isModuleLocked } from '../src/module-availability.js';
import { renderModel3dMarkup, modelViews } from '../src/model3d-markup.js';

// Interactive STL viewer for the single Job Kelas Extrim lesson.

document.addEventListener('DOMContentLoaded', () => {
  if (isModuleLocked('model3d')) return;
  const section = document.getElementById('model3d');
  if (!section) return;
  section.innerHTML = renderModel3dMarkup();
  document.getElementById('model3d-start')?.addEventListener('click', () => {
    document.getElementById('model3d-workspace')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  });

  const initializeViewer = () => {
  const shell = document.getElementById('model3d-shell');
  const canvas = document.getElementById('model3d-canvas');
  const fallback = document.getElementById('model3d-fallback');
  const status = document.getElementById('model3d-status');
  const resetButton = document.getElementById('model3d-reset');
  const autoRotateButton = document.getElementById('model3d-autorotate');
  const presetButtons = [...document.querySelectorAll('[data-model-view]')];

  if (!section || !shell || !canvas) return;

  let viewerFailed = false;
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    depth: true,
    powerPreference: 'high-performance'
  });

  const showFallback = (message) => {
    viewerFailed = true;
    canvas.hidden = true;
    section.querySelectorAll('[data-model-view], [data-render-mode], #model3d-autorotate, #model3d-reset, #model3d-zoom-in, #model3d-zoom-out').forEach(button => button.disabled = true);
    document.getElementById('model3d-stage-note').textContent = 'Pratinjau gambar · model interaktif tidak tersedia';
    document.getElementById('model3d-view-help').textContent = 'Berkas model tetap dapat diunduh pada panel keterangan.';
    if (fallback) fallback.hidden = false;
    if (status) {
      status.textContent = message;
      status.classList.remove('ready');
      status.classList.add('error');
    }
  };

  if (!gl) {
    showFallback('Mode gambar statis (WebGL tidak didukung)');
    return;
  }

  // --- SHADER 1: REALVIEW STUDIO PBR SHADER FOR SURFACES ---
  const mainVertexShaderSource = `
    attribute vec3 a_position;
    attribute vec3 a_normal;

    uniform mat4 u_model_view;
    uniform mat4 u_projection;

    varying vec3 v_normal;
    varying vec3 v_position;

    void main() {
      v_normal = normalize(mat3(u_model_view) * a_normal);
      v_position = (u_model_view * vec4(a_position, 1.0)).xyz;
      gl_Position = u_projection * u_model_view * vec4(a_position, 1.0);
    }
  `;

  const mainFragmentShaderSource = `
    precision mediump float;

    varying vec3 v_normal;
    varying vec3 v_position;

    uniform vec3 u_base_color;
    uniform float u_specular_strength;
    uniform float u_shininess;

    void main() {
      vec3 N = normalize(v_normal);
      vec3 V = normalize(-v_position);

      // Three-point Studio Lighting
      vec3 keyLightDir = normalize(vec3(-0.45, 0.75, 0.65));
      vec3 fillLightDir = normalize(vec3(0.55, -0.25, 0.45));
      vec3 backLightDir = normalize(vec3(0.0, -0.6, -0.8));

      // Halfway vectors for specular highlights
      vec3 H1 = normalize(keyLightDir + V);
      vec3 H2 = normalize(fillLightDir + V);

      // Diffuse
      float diff1 = max(dot(N, keyLightDir), 0.0);
      float diff2 = max(dot(N, fillLightDir), 0.0) * 0.35;
      float ambient = 0.28;

      // Specular highlights (Blinn-Phong)
      float spec1 = pow(max(dot(N, H1), 0.0), u_shininess) * u_specular_strength;
      float spec2 = pow(max(dot(N, H2), 0.0), u_shininess * 0.5) * (u_specular_strength * 0.3);

      // Fresnel rim glow
      float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.8) * 0.4;

      // Color composition
      vec3 diffuse = u_base_color * (ambient + diff1 * 0.7 + diff2);
      vec3 specular = vec3(0.96, 0.98, 1.0) * (spec1 + spec2);
      vec3 rim = vec3(0.85, 0.92, 1.0) * fresnel;

      vec3 finalColor = diffuse + specular + rim;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // --- SHADER 2: CRISP FEATURE EDGE OUTLINES ---
  const edgeVertexShaderSource = `
    attribute vec3 a_position;
    uniform mat4 u_model_view;
    uniform mat4 u_projection;

    void main() {
      gl_Position = u_projection * u_model_view * vec4(a_position, 1.0);
    }
  `;

  const edgeFragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_edge_color;

    void main() {
      gl_FragColor = u_edge_color;
    }
  `;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || 'Shader gagal dibuat.');
    }
    return shader;
  };

  const createProgram = (vertSource, fragSource) => {
    const prog = gl.createProgram();
    const vs = compileShader(gl.VERTEX_SHADER, vertSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fragSource);
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) || 'Program shader gagal ditautkan.');
    }
    return prog;
  };

  let mainProgram;
  let edgeProgram;

  try {
    mainProgram = createProgram(mainVertexShaderSource, mainFragmentShaderSource);
    edgeProgram = createProgram(edgeVertexShaderSource, edgeFragmentShaderSource);
  } catch (error) {
    console.error('Shader 3D tidak dapat disiapkan', error);
    showFallback('Mode gambar statis');
    return;
  }

  // Uniform and Attrib locations for mainProgram
  const mainPosLoc = gl.getAttribLocation(mainProgram, 'a_position');
  const mainNormLoc = gl.getAttribLocation(mainProgram, 'a_normal');
  const mainModelViewLoc = gl.getUniformLocation(mainProgram, 'u_model_view');
  const mainProjLoc = gl.getUniformLocation(mainProgram, 'u_projection');
  const mainBaseColorLoc = gl.getUniformLocation(mainProgram, 'u_base_color');
  const mainSpecStrengthLoc = gl.getUniformLocation(mainProgram, 'u_specular_strength');
  const mainShininessLoc = gl.getUniformLocation(mainProgram, 'u_shininess');

  // Uniform and Attrib locations for edgeProgram
  const edgePosLoc = gl.getAttribLocation(edgeProgram, 'a_position');
  const edgeModelViewLoc = gl.getUniformLocation(edgeProgram, 'u_model_view');
  const edgeProjLoc = gl.getUniformLocation(edgeProgram, 'u_projection');
  const edgeColorLoc = gl.getUniformLocation(edgeProgram, 'u_edge_color');

  // Buffers
  const vertexBuffer = gl.createBuffer();
  const edgeBuffer = gl.createBuffer();

  // Matrices helpers
  const identity = () => new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);

  const multiply = (left, right) => {
    const output = new Float32Array(16);
    for (let column = 0; column < 4; column += 1) {
      for (let row = 0; row < 4; row += 1) {
        output[column * 4 + row] =
          left[row] * right[column * 4] +
          left[4 + row] * right[column * 4 + 1] +
          left[8 + row] * right[column * 4 + 2] +
          left[12 + row] * right[column * 4 + 3];
      }
    }
    return output;
  };

  const translation = (x, y, z) => {
    const matrix = identity();
    matrix[12] = x;
    matrix[13] = y;
    matrix[14] = z;
    return matrix;
  };

  const rotationX = (angle) => {
    const matrix = identity();
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    matrix[5] = cosine;
    matrix[6] = sine;
    matrix[9] = -sine;
    matrix[10] = cosine;
    return matrix;
  };

  const rotationY = (angle) => {
    const matrix = identity();
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    matrix[0] = cosine;
    matrix[2] = -sine;
    matrix[8] = sine;
    matrix[10] = cosine;
    return matrix;
  };

  const perspective = (fieldOfView, aspect, near, far) => {
    const matrix = new Float32Array(16);
    const focal = 1 / Math.tan(fieldOfView / 2);
    matrix[0] = focal / aspect;
    matrix[5] = focal;
    matrix[10] = (far + near) / (near - far);
    matrix[11] = -1;
    matrix[14] = (2 * far * near) / (near - far);
    return matrix;
  };

  const orthographic = (halfHeight, aspect, near, far) => {
    const matrix = identity();
    matrix[0] = 1 / (halfHeight * aspect);
    matrix[5] = 1 / halfHeight;
    matrix[10] = -2 / (far - near);
    matrix[14] = -(far + near) / (far - near);
    return matrix;
  };

  // --- STATE ---
  let vertexCount = 0;
  let edgeVertexCount = 0;
  let modelRadius = 58;
  let yaw = -0.62;
  let pitch = 0.34;
  let cameraDistance = 235;
  let dragging = false;
  let activePointerId = null;
  let previousPointer = null;
  let autoRotate = false;
  let animationFrame = null;
  let previousAnimationTime = null;

  // Visual Styles
  let renderMode = 'shaded-edges'; // 'shaded-edges', 'shaded', 'wireframe'
  let currentMaterial = 'mint';   // 'steel', 'aluminum', 'cyan', 'castiron'

  const MATERIALS = {
    mint: { baseColor: [0.38, 0.68, 0.55], specularStrength: 0.38, shininess: 36.0 },
    steel: {
      baseColor: [0.76, 0.82, 0.88],
      specularStrength: 0.85,
      shininess: 48.0
    },
    aluminum: {
      baseColor: [0.88, 0.91, 0.95],
      specularStrength: 0.95,
      shininess: 64.0
    },
    cyan: {
      baseColor: [0.12, 0.48, 0.76],
      specularStrength: 0.65,
      shininess: 32.0
    },
    castiron: {
      baseColor: [0.38, 0.41, 0.46],
      specularStrength: 0.42,
      shininess: 18.0
    }
  };

  const viewPresets = {
    isometric: { yaw: -0.62, pitch: 0.34 },
    front: { yaw: 0, pitch: 0 },
    top: { yaw: 0, pitch: Math.PI / 2 },
    right: { yaw: -Math.PI / 2, pitch: 0 },
    left: { yaw: Math.PI / 2, pitch: 0 },
    back: { yaw: Math.PI, pitch: 0 },
    bottom: { yaw: 0, pitch: -Math.PI / 2 }
  };
  let activeView = 'isometric';
  const updateZoomLabel = () => {
    document.getElementById('model3d-zoom-level').textContent = Math.round(modelRadius * 3.1 / cameraDistance * 100) + '%';
  };
  const updateActivePreset = (name = '') => {
    activeView = name;
    presetButtons.forEach(button => {
      const selected = button.dataset.modelView === name;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const view = modelViews[name] || { label: 'Putaran bebas', title: 'Jelajahi bentuknya.', description: modelViews.isometric.description, tip: 'Pilih tombol pandangan untuk kembali melihat benda dari arah yang tepat.' };
    document.getElementById('model3d-view-label').textContent = view.label;
    document.getElementById('model3d-detail-title').textContent = view.title;
    document.getElementById('model3d-detail-desc').textContent = view.description;
    document.getElementById('model3d-detail-tip').textContent = view.tip;
  };
  const setPreset = name => {
    const preset = viewPresets[name];
    if (!preset) return;
    yaw = preset.yaw;
    pitch = preset.pitch;
    cameraDistance = modelRadius * 3.1;
    updateActivePreset(name);
    updateZoomLabel();
    render();
  };

  // --- ADVANCED STL PARSER WITH SMOOTH NORMALS & FEATURE EDGE EXTRACTION ---
  const parseBinaryStl = (arrayBuffer) => {
    const view = new DataView(arrayBuffer);
    if (view.byteLength < 84) throw new Error('Berkas STL terlalu kecil.');
    const triangleCount = view.getUint32(80, true);
    const requiredBytes = 84 + triangleCount * 50;
    if (triangleCount === 0 || requiredBytes > view.byteLength) {
      throw new Error('Struktur STL tidak valid.');
    }

    const rawVertices = [];
    const faceNormals = [];
    const minimum = [Infinity, Infinity, Infinity];
    const maximum = [-Infinity, -Infinity, -Infinity];

    for (let t = 0; t < triangleCount; t += 1) {
      const faceOffset = 84 + (t * 50);
      let fnx = view.getFloat32(faceOffset, true);
      let fny = view.getFloat32(faceOffset + 4, true);
      let fnz = view.getFloat32(faceOffset + 8, true);

      const triCorners = [];
      for (let c = 0; c < 3; c += 1) {
        const vOffset = faceOffset + 12 + (c * 12);
        const x = view.getFloat32(vOffset, true);
        const y = view.getFloat32(vOffset + 4, true);
        const z = view.getFloat32(vOffset + 8, true);
        triCorners.push([x, y, z]);

        minimum[0] = Math.min(minimum[0], x);
        maximum[0] = Math.max(maximum[0], x);
        minimum[1] = Math.min(minimum[1], y);
        maximum[1] = Math.max(maximum[1], y);
        minimum[2] = Math.min(minimum[2], z);
        maximum[2] = Math.max(maximum[2], z);
      }

      // Recompute face normal if zero in STL
      let len = Math.hypot(fnx, fny, fnz);
      if (len < 0.001) {
        const ax = triCorners[1][0] - triCorners[0][0];
        const ay = triCorners[1][1] - triCorners[0][1];
        const az = triCorners[1][2] - triCorners[0][2];
        const bx = triCorners[2][0] - triCorners[0][0];
        const by = triCorners[2][1] - triCorners[0][1];
        const bz = triCorners[2][2] - triCorners[0][2];
        fnx = ay * bz - az * by;
        fny = az * bx - ax * bz;
        fnz = ax * by - ay * bx;
        len = Math.hypot(fnx, fny, fnz) || 1.0;
      }
      fnx /= len;
      fny /= len;
      fnz /= len;

      faceNormals.push([fnx, fny, fnz]);
      rawVertices.push(triCorners);
    }

    // Model Centering & Normalization
    const center = minimum.map((val, idx) => (val + maximum[idx]) / 2);
    modelRadius = 0;

    for (let t = 0; t < triangleCount; t += 1) {
      for (let c = 0; c < 3; c += 1) {
        rawVertices[t][c][0] -= center[0];
        rawVertices[t][c][1] -= center[1];
        rawVertices[t][c][2] -= center[2];
        modelRadius = Math.max(
          modelRadius,
          Math.hypot(rawVertices[t][c][0], rawVertices[t][c][1], rawVertices[t][c][2])
        );
      }
    }
    modelRadius = Math.max(modelRadius, 0.01);

    // 1. Compute Spatial Vertex Map for Smooth Normals
    const quantize = (coord) => `${Math.round(coord[0] * 200)},${Math.round(coord[1] * 200)},${Math.round(coord[2] * 200)}`;
    const vertexFacesMap = new Map();

    for (let t = 0; t < triangleCount; t += 1) {
      for (let c = 0; c < 3; c += 1) {
        const key = quantize(rawVertices[t][c]);
        if (!vertexFacesMap.has(key)) {
          vertexFacesMap.set(key, []);
        }
        vertexFacesMap.get(key).push(t);
      }
    }

    // 2. Feature Edge Extraction (Sharp crease edges & boundaries)
    const edgeMap = new Map();
    const makeEdgeKey = (p1, p2) => {
      const k1 = quantize(p1);
      const k2 = quantize(p2);
      return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
    };

    for (let t = 0; t < triangleCount; t += 1) {
      const tri = rawVertices[t];
      for (let i = 0; i < 3; i += 1) {
        const p1 = tri[i];
        const p2 = tri[(i + 1) % 3];
        const eKey = makeEdgeKey(p1, p2);
        if (!edgeMap.has(eKey)) {
          edgeMap.set(eKey, { p1, p2, normals: [faceNormals[t]] });
        } else {
          edgeMap.get(eKey).normals.push(faceNormals[t]);
        }
      }
    }

    const edgeLineVertices = [];
    edgeMap.forEach((edge) => {
      if (edge.normals.length === 1) {
        // Boundary edge
        edgeLineVertices.push(...edge.p1, ...edge.p2);
      } else if (edge.normals.length === 2) {
        // Crease angle between adjacent faces
        const dotProduct =
          edge.normals[0][0] * edge.normals[1][0] +
          edge.normals[0][1] * edge.normals[1][1] +
          edge.normals[0][2] * edge.normals[1][2];
        // If angle > 28 degrees (dot product < 0.88), mark as sharp CAD edge
        if (dotProduct < 0.88) {
          edgeLineVertices.push(...edge.p1, ...edge.p2);
        }
      }
    });

    // 3. Assemble Interleaved Triangle Data (Position + Smooth Normals)
    const interleaved = new Float32Array(triangleCount * 18);

    for (let t = 0; t < triangleCount; t += 1) {
      const fNorm = faceNormals[t];
      for (let c = 0; c < 3; c += 1) {
        const vert = rawVertices[t][c];
        const key = quantize(vert);
        const adjacentFaces = vertexFacesMap.get(key) || [t];

        // Average normals of faces that share this crease (< 45 deg)
        let nx = 0;
        let ny = 0;
        let nz = 0;
        for (let af of adjacentFaces) {
          const an = faceNormals[af];
          const dotP = fNorm[0] * an[0] + fNorm[1] * an[1] + fNorm[2] * an[2];
          if (dotP > 0.707) { // 45 degrees
            nx += an[0];
            ny += an[1];
            nz += an[2];
          }
        }
        const nLen = Math.hypot(nx, ny, nz) || 1.0;
        nx /= nLen;
        ny /= nLen;
        nz /= nLen;

        const outIdx = (t * 3 + c) * 6;
        interleaved[outIdx] = vert[0];
        interleaved[outIdx + 1] = vert[1];
        interleaved[outIdx + 2] = vert[2];
        interleaved[outIdx + 3] = nx;
        interleaved[outIdx + 4] = ny;
        interleaved[outIdx + 5] = nz;
      }
    }

    // Upload Triangle Buffers
    vertexCount = triangleCount * 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);

    // Upload Edge Buffers
    edgeVertexCount = edgeLineVertices.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, edgeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(edgeLineVertices), gl.STATIC_DRAW);

    cameraDistance = modelRadius * 3.1;
  };

  // --- RENDER FUNCTION ---
  const resizeCanvas = () => {
    const width = Math.max(1, shell.clientWidth);
    const height = Math.max(1, shell.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = Math.round(width * pixelRatio);
    const displayHeight = Math.round(height * pixelRatio);
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const render = () => {
    if (viewerFailed || document.hidden || !vertexCount || !section.classList.contains('active')) return;
    resizeCanvas();

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Matrices
    const baseOrientation = identity(); // This SolidWorks model uses Y as its vertical axis.
    const orbit = multiply(rotationY(yaw), rotationX(pitch));
    const model = multiply(orbit, baseOrientation);
    const view = translation(0, -modelRadius * 0.06, -cameraDistance);
    const modelView = multiply(view, model);
    const aspect = Math.max(0.1, canvas.width / canvas.height);
    // Keep the same horizontal framing on portrait phone viewports.
    const halfHeight = cameraDistance * Math.tan(Math.PI / 8) * Math.max(1, 1 / aspect);
    const near = Math.max(0.1, cameraDistance - modelRadius * 2.2);
    const far = cameraDistance + modelRadius * 3;
    const projection = activeView && activeView !== 'isometric'
      ? orthographic(halfHeight, aspect, near, far)
      : perspective(2 * Math.atan(halfHeight / cameraDistance), aspect, near, far);

    const mat = MATERIALS[currentMaterial] || MATERIALS.steel;

    // 1. Render Surfaces (Shaded)
    if (renderMode === 'shaded-edges' || renderMode === 'shaded') {
      gl.useProgram(mainProgram);
      gl.uniformMatrix4fv(mainModelViewLoc, false, modelView);
      gl.uniformMatrix4fv(mainProjLoc, false, projection);
      gl.uniform3fv(mainBaseColorLoc, mat.baseColor);
      gl.uniform1f(mainSpecStrengthLoc, mat.specularStrength);
      gl.uniform1f(mainShininessLoc, mat.shininess);

      // Offset polygons backwards so edge lines render cleanly on top
      if (renderMode === 'shaded-edges') {
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1.2, 1.2);
      } else {
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.enableVertexAttribArray(mainPosLoc);
      gl.vertexAttribPointer(mainPosLoc, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(mainNormLoc);
      gl.vertexAttribPointer(mainNormLoc, 3, gl.FLOAT, false, 24, 12);

      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    }

    // 2. Render CAD Feature Edges (Outlines)
    if ((renderMode === 'shaded-edges' || renderMode === 'wireframe') && edgeVertexCount > 0) {
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.useProgram(edgeProgram);
      gl.uniformMatrix4fv(edgeModelViewLoc, false, modelView);
      gl.uniformMatrix4fv(edgeProjLoc, false, projection);

      const edgeColor = renderMode === 'wireframe' ? [0.15, 0.45, 0.78, 1.0] : [0.10, 0.16, 0.24, 0.88];
      gl.uniform4fv(edgeColorLoc, edgeColor);

      gl.bindBuffer(gl.ARRAY_BUFFER, edgeBuffer);
      gl.enableVertexAttribArray(edgePosLoc);
      gl.vertexAttribPointer(edgePosLoc, 3, gl.FLOAT, false, 12, 0);

      gl.drawArrays(gl.LINES, 0, edgeVertexCount);
    }
  };

  // --- ANIMATION LOOP ---
  const stopAnimationLoop = () => {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    previousAnimationTime = null;
  };

  const animate = (timestamp) => {
    animationFrame = null;
    if (!autoRotate || document.hidden || !section.classList.contains('active')) {
      previousAnimationTime = null;
      return;
    }
    if (previousAnimationTime !== null) {
      const elapsed = Math.min(40, timestamp - previousAnimationTime);
      yaw += elapsed * 0.00035;
    }
    previousAnimationTime = timestamp;
    render();
    animationFrame = requestAnimationFrame(animate);
  };

  const startAnimationLoop = () => {
    if (animationFrame === null && autoRotate && !document.hidden && section.classList.contains('active')) {
      animationFrame = requestAnimationFrame(animate);
    }
  };

  let loaded = false;
  const loadModel = async () => {
    if (loaded) return;
    loaded = true;
    try {
      const response = await fetch(publicAssetUrl('models/solidworks-library/job-kelas-extrim.stl'));
      if (!response.ok) throw new Error('Model tidak ditemukan (' + response.status + ').');
      const buffer = await response.arrayBuffer();
      if (viewerFailed) return;
      parseBinaryStl(buffer);
      canvas.hidden = false;
      if (fallback) fallback.hidden = true;
      status.textContent = 'Model siap diputar';
      status.classList.add('ready');
      setPreset('isometric');
    } catch (error) {
      console.error('Job Kelas Extrim gagal dimuat:', error);
      showFallback('Mode gambar statis');
    }
  };
  const pauseRotation = () => {
    autoRotate = false;
    autoRotateButton?.setAttribute('aria-pressed', 'false');
    stopAnimationLoop();
  };
  const markExplored = () => window.completeModule?.('model3d');
  section.querySelectorAll('[data-render-mode]').forEach(button => {
    button.addEventListener('click', () => {
      renderMode = button.dataset.renderMode;
      section.querySelectorAll('[data-render-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      render();
    });
  });
  const zoomModel = factor => {
    cameraDistance = Math.max(modelRadius * 1.8, Math.min(modelRadius * 6.5, cameraDistance * factor));
    updateZoomLabel();
    render();
  };
  document.getElementById('model3d-zoom-in').addEventListener('click', () => zoomModel(.85));
  document.getElementById('model3d-zoom-out').addEventListener('click', () => zoomModel(1 / .85));

  // Preset Buttons
  presetButtons.forEach(button => {
    button.addEventListener('click', () => { pauseRotation(); setPreset(button.dataset.modelView); markExplored(); });
  });

  // Reset Button
  resetButton?.addEventListener('click', () => {
    autoRotate = false;
    autoRotateButton?.setAttribute('aria-pressed', 'false');
    stopAnimationLoop();
    setPreset('isometric');
    canvas.focus({ preventScroll: true });
  });

  // Auto-rotate Toggle
  autoRotateButton?.addEventListener('click', () => {
    autoRotate = !autoRotate;
    markExplored();
    autoRotateButton.setAttribute('aria-pressed', String(autoRotate));
    if (autoRotate) {
      updateActivePreset();
      startAnimationLoop();
    } else {
      stopAnimationLoop();
      render();
    }
  });

  // Pointer drag rotate
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || dragging) return;
    activePointerId = event.pointerId;
    pauseRotation();
    canvas.classList.add('is-dragging');
    markExplored();
    dragging = true;
    previousPointer = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    updateActivePreset();
  });

  canvas.addEventListener('pointermove', event => {
    if (!dragging || !previousPointer || event.pointerId !== activePointerId) return;
    const deltaX = event.clientX - previousPointer.x;
    const deltaY = event.clientY - previousPointer.y;
    yaw += deltaX * 0.009;
    pitch = Math.max(-1.48, Math.min(1.48, pitch + deltaY * 0.008));
    previousPointer = { x: event.clientX, y: event.clientY };
    render();
  });

  const stopDragging = event => {
    if (!dragging || event.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
    canvas.classList.remove('is-dragging');
    previousPointer = null;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {}
  };

  canvas.addEventListener('pointerup', stopDragging);
  canvas.addEventListener('pointercancel', stopDragging);
  canvas.addEventListener('lostpointercapture', stopDragging);

  // Wheel zoom
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    cameraDistance = Math.max(modelRadius * 1.8, Math.min(modelRadius * 6.5, cameraDistance + event.deltaY * 0.13));
    updateZoomLabel();
    render();
  }, { passive: false });

  // Keyboard navigation
  canvas.addEventListener('keydown', event => {
    const rotationStep = event.shiftKey ? 0.18 : 0.09;
    if (event.key === 'ArrowLeft') yaw -= rotationStep;
    else if (event.key === 'ArrowRight') yaw += rotationStep;
    else if (event.key === 'ArrowUp') pitch = Math.max(-1.48, pitch - rotationStep);
    else if (event.key === 'ArrowDown') pitch = Math.min(1.48, pitch + rotationStep);
    else if (event.key === '+' || event.key === '=') cameraDistance = Math.max(modelRadius * 1.8, cameraDistance - modelRadius * 0.18);
    else if (event.key === '-') cameraDistance = Math.min(modelRadius * 6.5, cameraDistance + modelRadius * 0.18);
    else if (event.key === '0') setPreset('isometric');
    else return;

    event.preventDefault();
    pauseRotation();
    markExplored();
    if (event.key.startsWith('Arrow')) updateActivePreset();
    updateZoomLabel();
    render();
  });

  const sectionObserver = new MutationObserver(() => {
    if (section.classList.contains('active')) {
      requestAnimationFrame(() => {
        render();
        startAnimationLoop();
      });
    } else {
      stopAnimationLoop();
    }
  });
  sectionObserver.observe(section, { attributes: true, attributeFilter: ['class'] });

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(() => requestAnimationFrame(render));
    resizeObserver.observe(shell);
  } else {
    window.addEventListener('resize', render);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAnimationLoop();
    else startAnimationLoop();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    pauseRotation();
    showFallback('Mode gambar statis');
  });
  loadModel();
  };

  // The WebGL context and mesh are created only when this lesson is opened.
  if (section.classList.contains('active')) initializeViewer();
  else {
    const initializationObserver = new MutationObserver(() => {
      if (!section.classList.contains('active')) return;
      initializationObserver.disconnect();
      initializeViewer();
    });
    initializationObserver.observe(section, { attributes: true, attributeFilter: ['class'] });
  }
});
