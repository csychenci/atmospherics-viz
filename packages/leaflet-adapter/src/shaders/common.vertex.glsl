#define GLSLIFY 1
attribute vec2 aPos;
uniform vec4 uVPars0;
uniform vec4 uVPars1;
varying vec4 vTc0;
void main(void){
  gl_Position=vec4(aPos*uVPars0.xy+uVPars0.zw,0.0,1.0);
  vec2 tc0=aPos.xy*0.5+0.5;
  vTc0=vec4(tc0*uVPars1.xy+uVPars1.zw,aPos.xy);
}