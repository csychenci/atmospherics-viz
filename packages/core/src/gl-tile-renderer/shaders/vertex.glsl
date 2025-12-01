#define GLSLIFY 1
attribute vec2 aPos;
uniform vec4 uVPars0;
uniform vec4 uVPars1;
uniform vec4 uVPars2;
varying vec4 vTc0;
varying vec4 vTc1;

void main(void){
  gl_Position=vec4(2.*aPos.xy-1.,0.,1.);
  vec2 tc=aPos.xy;
  vTc0.xy=tc*uVPars0.xy+uVPars0.zw;
  vTc0.zw=tc*uVPars1.xy+uVPars1.zw;
  vTc1.xy=tc*uVPars2.xy+uVPars2.zw;
  vTc1.zw=uVPars1.zw;
}