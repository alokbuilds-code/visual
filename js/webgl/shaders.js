/**
 * FIGMA-X: WebGL Shaders
 * Premium Blinn-Phong + Rim Fresnel Shader with Wireframe and lighting support.
 */

(function() {
  const vertexShaderSource = `
    attribute vec3 a_position;
    attribute vec3 a_normal;
    attribute vec2 a_texcoord;

    uniform mat4 u_modelMatrix;
    uniform mat4 u_viewMatrix;
    uniform mat4 u_projectionMatrix;
    uniform mat4 u_normalMatrix;

    varying vec3 v_normal;
    varying vec3 v_worldPosition;
    varying vec2 v_texcoord;

    void main() {
      vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
      v_worldPosition = worldPos.xyz;
      
      // Transform normal by normal matrix
      v_normal = normalize(mat3(u_normalMatrix) * a_normal);
      v_texcoord = a_texcoord;

      gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;

    varying vec3 v_normal;
    varying vec3 v_worldPosition;
    varying vec2 v_texcoord;

    uniform vec3 u_viewPosition;
    uniform vec3 u_lightDirection;
    uniform vec3 u_lightColor;
    uniform vec3 u_ambientColor;
    uniform vec3 u_diffuseColor;
    uniform vec3 u_specularColor;
    uniform float u_shininess;
    uniform float u_opacity;
    uniform int u_wireframe;

    void main() {
      if (u_wireframe == 1) {
        gl_FragColor = vec4(u_diffuseColor, u_opacity);
        return;
      }

      vec3 N = normalize(v_normal);
      vec3 L = normalize(u_lightDirection);
      vec3 V = normalize(u_viewPosition - v_worldPosition);
      vec3 H = normalize(L + V);

      // Diffuse
      float nDotL = max(dot(N, L), 0.0);
      vec3 diffuse = u_diffuseColor * u_lightColor * nDotL;

      // Specular (Blinn-Phong)
      float nDotH = max(dot(N, H), 0.0);
      float spec = pow(nDotH, u_shininess);
      vec3 specular = u_specularColor * spec;

      // Rim lighting (Fresnel edge glow for modern 3D look)
      float rim = 1.0 - max(dot(N, V), 0.0);
      rim = pow(rim, 2.5);
      vec3 rimColor = u_diffuseColor * rim * 0.75;

      // Ambient
      vec3 ambient = u_ambientColor * u_diffuseColor;

      vec3 finalColor = ambient + diffuse + specular + rimColor;
      gl_FragColor = vec4(finalColor, u_opacity);
    }
  `;

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.Shaders = {
    vertexShaderSource,
    fragmentShaderSource
  };
})();
