//-----------------------------------------------------------------------------
// glslを定義
// バーテックスシェーダー //
const vs = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

const fs = `
uniform sampler2D t1;
uniform float screenWidth;
uniform float screenHeight;
uniform float pointX;
uniform float pointY;
uniform float power;
varying vec2 vUv;

const float _S2 = 0.49;
const float _DeltaUV = 3.0; 
const float _Attenuation = 0.995;

void main(){
  vec2 uv = vUv; 
  
  // 1pxあたりの単位を計算する
  float du = 1.0 / screenWidth;
  float dv = 1.0 / screenHeight;
  vec3 duv = vec3(du, dv, 0.0) * _DeltaUV;
  
  // 現在の位置のテクセルをフェッチ
  vec4 c = texture2D(t1, uv);
  
  float asp = screenWidth / screenHeight;

  vec2 _uv = vec2( uv.x * asp, uv.y );

  if( length(_uv - vec2( pointX*asp, pointY )) < 0.05 )
  {
    c = vec4(power, 0.0 , 0.0, 0.0);
  }
  
  // 波動方程式
  // h(t + 1) = 2h + c(h(x + 1) + h(x - 1) + h(y + 1) + h(y - 1) - 4h) - h(t - 1)
  // 今回、h(t + 1)は次のフレームでの波の高さを表す
  // R,Gをそれぞれ高さとして使用
  float k = (2.0 * c.r) - c.g; //2h - h(t - 1) を先に計算
  float p = (k + _S2 * ( //_S2は係数 位相の変化する速度
      texture2D(t1, uv - duv.zy).r +
      texture2D(t1, uv + duv.zy).r +
      texture2D(t1, uv - duv.xz).r +
      texture2D(t1, uv + duv.xz).r - 4.0 * c.r)
    ) * _Attenuation; //減衰係数

    // 現在の状態をテクスチャのR成分に、ひとつ前の（過去の）状態をG成分に書き込む。
    gl_FragColor = vec4(p, c.r, 0, 1);
    }
`;

// バーテックスシェーダー //
const postVs = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

// フラグメントシェーダー //
const postFs = `
uniform sampler2D tDiffuse;
uniform sampler2D t1;
varying vec2 vUv;

void main(){
  vec4 c = texture2D(t1, vUv);
  gl_FragColor = vec4(c.r, c.r, c.r, 1.0);
}
`;

const fs_bump = `
uniform sampler2D t1;
uniform float screenWidth;
uniform float screenHeight;
varying vec2 vUv;

const float _ParallaxScale = 100.0;

void main(){
  vec2 uv = vUv;
  // vec4 c = texture2D(t1, vUv);
  float _NormalScaleFactor = texture2D(t1, vUv).r;

  vec2 shiftX = vec2( 1.0 / screenWidth, 0.0 );
  vec2 shiftZ = vec2( 0.0, 1.0 / screenHeight ); 

  shiftX *= _ParallaxScale * _NormalScaleFactor;
  shiftZ *= _ParallaxScale * _NormalScaleFactor;

  vec3 texX = 2.0 * texture2D(t1, uv.xy + shiftX).rgb - 1.0;
  vec3 texx = 2.0 * texture2D(t1, uv.xy - shiftX).rgb - 1.0;
  vec3 texZ = 2.0 * texture2D(t1, uv.xy + shiftZ).rgb - 1.0;
  vec3 texz = 2.0 * texture2D(t1, uv.xy - shiftZ).rgb - 1.0;

  vec3 du = vec3( 1.0, 0.0, _NormalScaleFactor * (texX.x - texx.x));
  vec3 dv = vec3( 0.0, 1.0, _NormalScaleFactor * (texZ.x - texz.x));

   vec3 normal = normalize(cross(du, dv)) * 0.5 + 0.5;
   gl_FragColor = vec4(normal, 1.0);
}
`;

//-----------------------------------------------------------------------------
// three.js関連

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );

document.body.appendChild( renderer.domElement );
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100vh";

// scene作成 //
const scene = new THREE.Scene();

// scene作成 //
const subScene = new THREE.Scene();

// camera作成 //
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

// オフスクリーンバッファ作成 //
const renderTergets = [];
renderTergets[0] = new THREE.WebGLRenderTarget(1024, 1024, {
  depthBuffer: false,
  stencilBuffer: false,
  magFilter: THREE.NearestFilter,
  minFilter: THREE.NearestFilter,
  wrapS: THREE.ClampToEdgeWrapping,
  wrapT: THREE.ClampToEdgeWrapping
});
renderTergets[1] = new THREE.WebGLRenderTarget(1024, 1024, {
  depthBuffer: false,
  stencilBuffer: false,
  magFilter: THREE.NearestFilter,
  minFilter: THREE.NearestFilter,
  wrapS: THREE.ClampToEdgeWrapping,
  wrapT: THREE.ClampToEdgeWrapping
});



// オフスクリーン描画用プレーン追加 //
const hadouPlaneGeometry = new THREE.PlaneBufferGeometry(2,2);
const hadouPlaneMaterial = new THREE.ShaderMaterial({
    vertexShader: vs,
    fragmentShader: fs,
    uniforms: {
        t1: {type: "t", value: null},
        screenWidth: { type:'f', value: window.innerWidth },
        screenHeight: { type:'f', value: window.innerHeight },
        pointX: { type:'f', value: 0.0 },
        pointY: { type:'f', value: 0.0 },
        power: {type:'f', value:0.0},
    },
});
const hadouMesh = new THREE.Mesh(hadouPlaneGeometry, hadouPlaneMaterial);
subScene.add(hadouMesh);


const geometry = new THREE.PlaneGeometry();
const material = new THREE.MeshPhongMaterial( 
  {
    color: 0xFFFFFF, 
    // side: THREE.DoubleSide,
    // wireframe: true,
    map: null,
    normalMap: null,
    normalScale: new THREE.Vector2( 1, -1)

  } );
const plane = new THREE.Mesh( geometry, material );
plane.position.z = -1;
plane.scale.x = 3.2;
plane.scale.y = 1.55;
scene.add( plane );


const normalRT = new THREE.WebGLRenderTarget(1024, 1024, {
  depthBuffer: false,
  stencilBuffer: false,
  magFilter: THREE.NearestFilter,
  minFilter: THREE.NearestFilter,
  wrapS: THREE.ClampToEdgeWrapping,
  wrapT: THREE.ClampToEdgeWrapping
});



// オフスクリーン描画用プレーン追加 //
const noemalPlaneGeometry = new THREE.PlaneBufferGeometry(2,2);
const normalPlaneMaterial = new THREE.ShaderMaterial({
    vertexShader: vs,
    fragmentShader: fs_bump
    ,
    uniforms: {
        t1: {type: "t", value: null},
        screenWidth: { type:'f', value: window.innerWidth },
        screenHeight: { type:'f', value: window.innerHeight },
    },
});
const normalMesh = new THREE.Mesh(noemalPlaneGeometry, normalPlaneMaterial);
subScene.add(normalMesh);



// スワップ用変数 //
let src = renderTergets[0];
let dest = renderTergets[1];
let frameCount = 0;

// 環境光
const ambLight = new THREE.AmbientLight(0x000000, 1.0);
scene.add(ambLight);

// 平行光
const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.1);
dirLight.position.x = -100;
dirLight.position.z = 40;
dirLight.position.z = 100;
scene.add(dirLight);

// 点光源
for(let i = 0; i < 8; ++i) {
  const color = new THREE.Color(
    Math.random(), Math.random(), Math.random()
  );

  const intensity = Math.random() * 5.0;
  const distance = Math.random() * 5.0 + 1.0;


  const light = new THREE.PointLight(color, intensity, distance);
  light.position.x = Math.random() * 2.0 - 1.0;
  light.position.y = Math.random() * 2.0 - 1.0;
  light.position.z = -1;
  scene.add(light);

}


// メインループ //
function animate() {
	requestAnimationFrame( animate );

  src = renderTergets[ frameCount % 2 ] ;
  dest = renderTergets[ (frameCount+1)%2 ] ;
  
  // 波動描画 //
  hadouMesh.visible = true;
  normalMesh.visible = false;
  hadouPlaneMaterial.uniforms.t1.value = src.texture;

  renderer.setRenderTarget(dest);
	renderer.render( subScene, camera );

  // バンプ生成 //
  hadouMesh.visible = false;
  normalMesh.visible = true;
  normalPlaneMaterial.uniforms.t1.value = dest.texture;
  renderer.setRenderTarget(normalRT);
	renderer.render( subScene, camera );

  // rendertargetもどす //
  renderer.setRenderTarget(null);


  // メインシーン描画 //
  // material.map = normalRT.texture;
  material.normalMap = normalRT.texture;
  renderer.render( scene, camera );

  frameCount++;

}
animate();


window.addEventListener('mousemove', e => {
  hadouPlaneMaterial.uniforms.pointX.value = e.clientX / window.innerWidth;
  hadouPlaneMaterial.uniforms.pointY.value = 1 - ( e.clientY / window.innerHeight );
  hadouPlaneMaterial.uniforms.power.value = 1.0;
});