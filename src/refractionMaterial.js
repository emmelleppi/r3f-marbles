import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

export const frag = `
uniform sampler2D envMap;
uniform sampler2D backfaceMap;
uniform vec2 resolution;

varying vec3 worldNormal;
varying vec3 viewDirection;
varying vec2 vUv;

float ior = 1.5;
float a = 0.5;

vec3 fogColor = vec3(1.0);
vec3 reflectionColor = vec3(1.0);

float fresnelFunc(vec3 viewDirection, vec3 worldNormal) {
    return pow( 1.08 + dot( viewDirection, worldNormal), 10.0 );
}

void main() {
    // screen coordinates
    vec2 uv = gl_FragCoord.xy / resolution;

    // sample backface data from texture
    vec3 backfaceNormal = texture2D(backfaceMap, uv).rgb;

    // combine backface and frontface normal
    vec3 normal = worldNormal * (1.0 - a) - backfaceNormal * a;

    // calculate refraction and apply to uv
    vec3 refracted = refract(viewDirection, normal, 1.0/ior);
    uv += refracted.xy;

    // sample environment texture
    vec4 tex = texture2D(envMap, uv) ;

    // calculate fresnel
    float fresnel = fresnelFunc(viewDirection, normal);

    vec4 color = tex;

    // apply fresnel
    color.rgb = mix(color.rgb, reflectionColor, fresnel);

    gl_FragColor = vec4(color.rgb, 0.95);
}`

export const vert = `varying vec3 worldNormal;
varying vec3 viewDirection;
varying vec2 vUv;

void main() {
    vUv = uv;

    vec4 transformedNormal = vec4(normal, 0.);
    vec4 transformedPosition = vec4(position, 1.0);
    #ifdef USE_INSTANCING
        transformedNormal = instanceMatrix * transformedNormal;
        transformedPosition = instanceMatrix * transformedPosition;
    #endif

    vec4 worldPosition = modelMatrix * vec4( position, 1.0);
    worldNormal = normalize( modelViewMatrix * transformedNormal).xyz;
    viewDirection = normalize(worldPosition.xyz - cameraPosition);;
    gl_Position = projectionMatrix * modelViewMatrix * transformedPosition;
}
`

export const RefractionMaterial = shaderMaterial(
  {
    envMap: null,
    backfaceMap: null,
    resolution: new THREE.Vector2()
  },
  vert,
  frag
)
