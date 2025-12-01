precision highp float;
#define GLSLIFY 1
uniform vec4 uPars0;
uniform vec4 uPars1;
uniform vec4 uPars2;
uniform sampler2D sTex0;
uniform sampler2D sGrad;
#ifdef CLOUDS
uniform sampler2D sGrad2;
#endif
#ifdef PATT
uniform sampler2D sPatt;
#endif
#ifdef PATT2
uniform sampler2D sPatt2;
#endif
varying vec4 vTc0;
varying vec4 vTc1;

vec4 cubicHermite4(vec4 A,vec4 B,vec4 C,vec4 D,float t){
  mediump vec4 a=-A*0.5+(3.0*B)*0.5-(3.0*C)*0.5+D*0.5;
  mediump vec4 b=A-(5.0*B)*0.5+2.0*C-D*0.5;
  mediump vec4 c=-A*0.5+C*0.5;
  mediump vec4 d=B;
  mediump float tt=t*t;
  return clamp(a*tt*t+b*tt+c*t+d,vec4(0.),vec4(1.));
}

float cubicHermite(vec4 X,float t){
  mediump float a=-X.x*.5+(3.*X.y)*.5-(3.*X.z)*.5+X.w*.5;
  mediump float b=X.x-(5.*X.y)*.5+2.*X.z-X.w*.5;
  mediump float c=-X.x*.5+X.z*.5;
  mediump float d=X.y;
  mediump float tt=t*t;
  return clamp(a*tt*t+b*tt+c*t+d,0.,1.);
}

void main(void){
  #ifdef PATT
  lowp vec4 patt=texture2D(sPatt,vTc0.zw);
  #endif
  #ifdef PATT2
  lowp vec4 patt2=texture2D(sPatt2,vTc0.zw);
  #endif
  mediump vec2 f1=fract(vTc1.xy);
  mediump vec2 f0=vec2(1.)-f1;
  mediump vec4 w4=vec4(f0.y*f0.x,f0.y*f1.x,f1.y*f0.x,f1.y*f1.x);
  mediump float u1=vTc0.x;
  mediump float u2=vTc0.x+vTc1.z;
  mediump float v1=vTc0.y;
  mediump float v2=vTc0.y+vTc1.w;
  lowp vec4 s11=texture2D(sTex0,vec2(u1,v1));
  lowp vec4 s12=texture2D(sTex0,vec2(u2,v1));
  lowp vec4 s21=texture2D(sTex0,vec2(u1,v2));
  lowp vec4 s22=texture2D(sTex0,vec2(u2,v2));
  float r;
  mediump float g;
  lowp float a;
  #ifdef BICUBIC
  mediump float u0=vTc0.x-vTc1.z;
  mediump float u3=u2+vTc1.z;
  mediump float v0=vTc0.y-vTc1.w;
  mediump float v3=v2+vTc1.w;
  lowp vec4 s00=texture2D(sTex0,vec2(u0,v0));
  lowp vec4 s01=texture2D(sTex0,vec2(u1,v0));
  lowp vec4 s02=texture2D(sTex0,vec2(u2,v0));
  lowp vec4 s03=texture2D(sTex0,vec2(u3,v0));
  lowp vec4 s10=texture2D(sTex0,vec2(u0,v1));
  lowp vec4 s13=texture2D(sTex0,vec2(u3,v1));
  lowp vec4 s20=texture2D(sTex0,vec2(u0,v2));
  lowp vec4 s23=texture2D(sTex0,vec2(u3,v2));
  lowp vec4 s30=texture2D(sTex0,vec2(u0,v3));
  lowp vec4 s31=texture2D(sTex0,vec2(u1,v3));
  lowp vec4 s32=texture2D(sTex0,vec2(u2,v3));
  lowp vec4 s33=texture2D(sTex0,vec2(u3,v3));
  lowp vec4 r0=vec4(s00.r,s01.r,s02.r,s03.r);
  lowp vec4 r1=vec4(s10.r,s11.r,s12.r,s13.r);
  lowp vec4 r2=vec4(s20.r,s21.r,s22.r,s23.r);
  lowp vec4 r3=vec4(s30.r,s31.r,s32.r,s33.r);
  lowp vec4 r4=cubicHermite4(r0,r1,r2,r3,f1.y);
  r=cubicHermite(r4,f1.x);
  lowp float rMax=max(max(s11.r,s12.r),max(s21.r,s22.r));
  lowp float rMin=min(min(s11.r,s12.r),min(s21.r,s22.r));
  r=clamp(r,rMin,rMax);
  #ifdef BCH
  lowp vec4 b0=vec4(s00.b,s01.b,s02.b,s03.b);
  lowp vec4 b1=vec4(s10.b,s11.b,s12.b,s13.b);
  lowp vec4 b2=vec4(s20.b,s21.b,s22.b,s23.b);
  lowp vec4 b3=vec4(s30.b,s31.b,s32.b,s33.b);
  lowp vec4 b4=cubicHermite4(b0,b1,b2,b3,f1.y);
  r=cubicHermite(b4,f1.x);
  #endif
  #ifdef VSIZE
  lowp vec4 g0=vec4(s00.g,s01.g,s02.g,s03.g);
  lowp vec4 g1=vec4(s10.g,s11.g,s12.g,s13.g);
  lowp vec4 g2=vec4(s20.g,s21.g,s22.g,s23.g);
  lowp vec4 g3=vec4(s30.g,s31.g,s32.g,s33.g);
  lowp vec4 gg=cubicHermite4(g0,g1,g2,g3,f1.y);
  g=cubicHermite(gg,f1.x);
  #endif
  #ifdef PNG
  a=max(sign(dot(vec4(s11.a,s12.a,s21.a,s22.a),w4)-0.66),0.);
  #else
  a=1.-max(sign(dot(vec4(s11.b,s12.b,s21.b,s22.b),w4)-0.33),0.);
  #endif
  #else
  r=dot(vec4(s11.r,s12.r,s21.r,s22.r),w4);
  #ifdef VSIZE
  g=dot(vec4(s11.g,s12.g,s21.g,s22.g),w4);
  #endif
  #ifdef PNG
  #ifdef BILIN_A
  a=max(sign(dot(vec4(s11.a,s12.a,s21.a,s22.a),w4)-0.66),0.);
  #else
  a=min(min(s11.a,s12.a),min(s21.a,s22.a));
  #endif
  #else
  #ifdef BILIN_A
  a=1.-max(sign(dot(vec4(s11.b,s12.b,s21.b,s22.b),w4)-0.33),0.);
  #else
  a=1.-max(max(s11.b,s12.b),max(s21.b,s22.b));
  #endif
  #endif
  #endif
  r=r*uPars0.x+uPars0.y;
  #ifdef LOG
  r=max(uPars2.y,pow(2.,r)+uPars2.x);
  #endif
  float gx=r;
  #ifdef VSIZE
  g=g*uPars0.z+uPars0.w;
  gx=length(vec2(r,g));
  #endif
  vec2 gradTc=vec2(gx*uPars1.x+uPars1.y,.5);
  lowp vec3 rgb=texture2D(sGrad,gradTc).rgb;
  #ifdef CCL
  mediump vec4 g4=vec4(s11.g,s12.g,s21.g,s22.g)*uPars0.zzzz+uPars0.wwww;
  lowp vec4 mr4=sign(g4-1.)-sign(g4-2.)+sign(g4-3.)-sign(g4-4.);
  lowp vec4 mg4=sign(g4-2.)-sign(g4-3.)+sign(g4-4.)-sign(g4-5.);
  lowp vec4 mb4=sign(g4-6.);
  lowp vec4 ma4=sign(g4-3.)-sign(g4-6.)+sign(g4-7.);
  lowp float mr=dot(clamp(mr4,0.,1.),w4);
  lowp float mg=dot(clamp(mg4,0.,1.),w4);
  lowp float mb=dot(clamp(mb4,0.,1.),w4);
  lowp float ma=dot(clamp(ma4,0.,1.),w4);
  lowp vec4 mask=clamp(vec4(mr,mg,mb,ma)*10.-4.5,0.,1.);
  lowp float add=min(dot(patt.rg,mask.rg),1.)*0.4;
  lowp vec2 pattM=vec2(patt.a*0.35,patt.b-0.35);
  lowp float mul=1.-clamp(dot(pattM,mask.ab),.0,.4);
  rgb=mix(rgb*mul,vec3(1.),vec3(add));
  #endif
  #ifdef CLOUDS
  g=dot(vec4(s11.g,s12.g,s21.g,s22.g),w4);
  g=g*uPars0.z+uPars0.w;
  if(g>10.)g=g*10.-90.;
  lowp vec4 grad2=texture2D(sGrad2,vec2(g*uPars1.z+uPars1.w,.5));
  lowp float pa=max(0.0,sign(patt.r+grad2.a-1.));
  rgb=mix(rgb,grad2.rgb,vec3(pa));
  #endif
  #ifdef RAIN
  if(r>0.1){
    vec4 g4=vec4(s11.g,s12.g,s21.g,s22.g)*uPars0.zzzz+uPars0.wwww;
    lowp vec4 k0=vec4(0.);
    lowp vec4 k1=vec4(1.);
    lowp vec4 m45=sign(g4-4.)-sign(g4-6.);
    lowp vec4 m07=sign(g4-7.)-sign(g4-8.);
    lowp vec4 m06=sign(g4-6.)-sign(g4-7.);
    lowp vec4 m08=sign(g4-8.)-sign(g4-9.);
    lowp vec4 m09=sign(g4-9.)-sign(g4-10.);
    lowp vec4 m10=sign(g4-10.)-sign(g4-11.);
    lowp vec4 m11=sign(g4-11.)-sign(g4-12.);
    lowp vec4 m03=sign(g4-3.)-sign(g4-4.);
    lowp float mr1=dot(clamp(m06,k0,k1),w4);
    lowp float mg1=dot(clamp(m45,k0,k1),w4);
    lowp float mb1=dot(clamp(m07,k0,k1),w4);
    lowp float ma1=dot(clamp(m08,k0,k1),w4);
    lowp vec4 mask1=clamp(vec4(mr1,mg1,mb1,ma1)*10.-4.5,0.,1.);
    lowp vec4 masked1=patt*mask1;
    lowp float mr2=dot(clamp(m09,k0,k1),w4);
    lowp float mg2=dot(clamp(m10,k0,k1),w4);
    lowp float mb2=dot(clamp(m11,k0,k1),w4);
    lowp float ma2=dot(clamp(m03,k0,k1),w4);
    lowp vec4 mask2=clamp(vec4(mr2,mg2,mb2,ma2)*10.-4.5,0.,1.);
    lowp vec4 masked2=patt2*mask2;
    rgb=mix(rgb,vec3(0.85,0.85,1.0),masked1.rrr*.65);
    rgb=mix(rgb,vec3(1.0,1.0,1.0),masked1.ggg*.55);
    rgb=mix(rgb,vec3(0.8,0.9,1.0),masked1.bbb*.5);
    rgb=mix(rgb,vec3(0.8,0.7,1.0),masked1.aaa*.6);
    rgb=mix(rgb,vec3(1.0,1.0,0.7),masked2.rrr*.27);
    rgb=mix(rgb,vec3(1.0,1.0,0.7),masked2.ggg*.50);
    rgb=mix(rgb,vec3(1.0,1.0,0.7),masked2.bbb*.70);
    rgb=mix(rgb,vec3(1.0,0.8,0.8),masked2.aaa*.9);
  }
  #endif
  vec3 bgColor=vec3(uPars2.z);
  gl_FragColor=vec4(mix(bgColor,rgb,vec3(a)),1.);
}