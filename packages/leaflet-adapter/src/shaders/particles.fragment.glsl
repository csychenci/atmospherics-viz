precision mediump float;
#define GLSLIFY 1
uniform vec4 uPars0;
uniform vec4 uPars1;
varying vec4 vTc0;
varying float vDiscard;
void main(void){
  if(vDiscard<=0.0){
    discard;
  }
  float aa=clamp(uPars1.x-abs(vTc0.r),0.0,1.0);
  gl_FragColor=uPars0*vec4(aa);
}