precision highp float;
#define GLSLIFY 1
attribute vec4 aVecA;
uniform sampler2D sState0;
uniform sampler2D sState1;
uniform vec4 uVPars0;
uniform vec4 uVPars1;
uniform vec4 uVPars2;
uniform vec4 uVPars3;
varying vec4 vTc0;
varying float vDiscard;
void main(){
  vec2 tc=aVecA.xy*uVPars0.xy+uVPars0.zw;
  vec4 tex0=texture2D(sState0,tc);
  vDiscard=step(0.025,tex0.r+tex0.g+tex0.b+tex0.a);
  vec4 tex1=texture2D(sState1,tc);
  vec2 posA=fract(tex0.ba+tex0.rg/255.5+uVPars3.xy)*2.0-1.0;
  vec2 posB=fract(tex1.ba+tex1.rg/255.5+uVPars3.xy)*2.0-1.0;
  vec2 dirF=posA-posB;
  vec2 dirFN=normalize(dirF);
  float d=length(dirF);
  vec2 dirRN=vec2(dirFN.y,-dirFN.x);
  vec2 pos=mix(posB,posA,aVecA.w*0.003921569);
  pos+=dirRN*(aVecA.zz*uVPars1.xy+uVPars1.zw);
  #ifdef WAVES
  pos+=dirFN*(aVecA.ww*uVPars2.xy+uVPars2.zw);
  if(d>0.5||d<0.00005){pos.x+=10.0;}
  #else
  if(d>0.5){
    pos.x+=10.0;
  }
  #endif
  gl_Position=vec4(pos.xy,0,1);
  vTc0.x=uVPars3.z*aVecA.z+uVPars3.w;
}