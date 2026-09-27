/* 兔子尾巴：切掉模型自带的心形粉顶肉块，换成一颗贴在屁股上的白色小毛球。
   经典脚本（非 module）：Chrome 在 file:// 下禁止动态 import()，所以挂到 window.BunnyTail。
   用法：window.BunnyTail.applyTail(root, THREE, {mode:'hero'|'game', ...任意数值参数})
   - 切除区域在「根空间、按包围盒高度归一化」里定义，两份模型（bunny_idle.glb / bunny_blank.glb）通用。
   - 不重算身体法线（重算会让分裂顶点出棱）；只删三角形。
   - 身体是 SkinnedMesh 时球也是 SkinnedMesh，绑同一副骨架，SkeletonUtils.clone 会把球一起克隆。 */
(function(){
  var DEFAULTS={
    nx0:.095, ny0:.055, ny1:.35, nz0:-Infinity, nz1:Infinity, // 切除区（占包围盒高度的比例）
    nx0Static:.105, // 静态模型（无蒙皮）用的 nx0：它的尾根更深，.095 会留粉边；动画模型到 .105 会切进右大腿。外部传 nx0 时两者都用传入值
    k:1.15,        // 球半径 = k × 切口环最大半径
    push:.35,      // 球心沿外法向推出 push × R
    cover:.97,     // 覆盖检查：环上顶点到球心距离 ≤ cover × R
    lump:.06,      // 绒毛起伏幅度
    squash:.88,    // 沿外法向压扁
    tiltY:0,       // 外法向 y 分量微调
    color:0xFFFCF8, emi:.34, rough:.9,
    seg:null,      // 为 null 时按 mode：hero 48，game 24
    mode:'hero'
  };

  function applyTail(root,THREE,opts){
    if(!root)return null;
    if(root.userData.bunnyTail)return root.userData.bunnyTail;
    var o=Object.assign({},DEFAULTS,opts||{});
    var seg=o.seg||(o.mode==='game'?24:48);

    root.updateMatrixWorld(true);
    var rootInv=root.matrixWorld.clone().invert();
    var meshes=[];
    root.traverse(function(m){
      if(m.isMesh&&m.geometry&&m.geometry.attributes.position&&!(m.userData&&m.userData.noFurify))
        meshes.push({m:m,toRoot:new THREE.Matrix4().multiplyMatrices(rootInv,m.matrixWorld)});
    });
    if(!meshes.length)return null;

    /* 根空间包围盒 */
    var v=new THREE.Vector3(),bb=new THREE.Box3();
    meshes.forEach(function(e){var pos=e.m.geometry.attributes.position;
      for(var i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(e.toRoot);bb.expandByPoint(v);}});
    var h=bb.max.y-bb.min.y;
    var isStatic=!meshes.some(function(e){return e.m.isSkinnedMesh;});
    var nx0=(opts&&opts.nx0!=null)?opts.nx0:(isStatic?o.nx0Static:o.nx0);
    var X0=bb.min.x+nx0*h,Y0=bb.min.y+o.ny0*h,Y1=bb.min.y+o.ny1*h;
    var Z0=isFinite(o.nz0)?bb.min.z+o.nz0*h:-Infinity,Z1=isFinite(o.nz1)?bb.min.z+o.nz1*h:Infinity;

    /* 逐 mesh 删面，记录环与在内顶点 */
    var best=null,totalCut=0;
    meshes.forEach(function(e){
      var geo=e.m.geometry,pos=geo.attributes.position;
      if(!geo.index)return;
      var inside=new Uint8Array(pos.count);
      for(var i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(e.toRoot);
        inside[i]=(v.x<X0&&v.y>Y0&&v.y<Y1&&v.z>Z0&&v.z<Z1)?1:0;}
      var src=geo.index,keep=[],ring=new Set(),inV=new Set(),cut=0;
      for(var f=0;f<src.count;f+=3){
        var A=src.getX(f),B=src.getX(f+1),C=src.getX(f+2);
        if(inside[A]||inside[B]||inside[C]){cut++;
          [A,B,C].forEach(function(k){(inside[k]?inV:ring).add(k);});}
        else keep.push(A,B,C);
      }
      if(!cut)return;
      var Arr=pos.count>65535?Uint32Array:Uint16Array;
      geo.setIndex(new THREE.BufferAttribute(new Arr(keep),1));
      geo.computeBoundingBox();geo.computeBoundingSphere();
      totalCut+=cut;
      if(!best||cut>best.cut)best={e:e,cut:cut,ring:ring,inV:inV};
    });
    if(!best||!best.ring.size){root.userData.bunnyTail={skinned:false,cutFaces:totalCut,ringCount:0,opts:o};return root.userData.bunnyTail;}

    var body=best.e.m,geo=body.geometry,pos=geo.attributes.position;
    /* 几何空间：环心、环半径、在内质心、外法向 */
    var Cc=new THREE.Vector3(),Cin=new THREE.Vector3(),maxRing=0;
    best.ring.forEach(function(k){Cc.add(v.fromBufferAttribute(pos,k));});Cc.divideScalar(best.ring.size);
    best.ring.forEach(function(k){maxRing=Math.max(maxRing,v.fromBufferAttribute(pos,k).distanceTo(Cc));});
    best.inV.forEach(function(k){Cin.add(v.fromBufferAttribute(pos,k));});
    var n=new THREE.Vector3(-1,0,0);
    if(best.inV.size){Cin.divideScalar(best.inV.size);var d=Cin.clone().sub(Cc);if(d.lengthSq()>1e-12)n.copy(d.normalize());}
    n.y+=o.tiltY;n.normalize();

    /* 球半径与球心，覆盖检查 */
    var R=o.k*maxRing,P=new THREE.Vector3();
    for(var t=0;t<=15;t++){
      P.copy(Cc).addScaledVector(n,o.push*R);
      var ok=true;best.ring.forEach(function(k){if(v.fromBufferAttribute(pos,k).distanceTo(P)>o.cover*R)ok=false;});
      if(ok||t===15)break;R*=1.04;
    }

    /* 球几何：绒毛起伏 + 沿 n 压扁，只对球算法线 */
    var sg=new THREE.SphereGeometry(R,seg,Math.round(seg*2/3)),sp=sg.attributes.position,u=new THREE.Vector3();
    for(var i=0;i<sp.count;i++){
      v.fromBufferAttribute(sp,i);u.copy(v).normalize();
      v.multiplyScalar(1+o.lump*Math.sin(7*u.x+1.3)*Math.sin(6*u.y+.7)*Math.sin(8*u.z+2.1));
      v.addScaledVector(n,-v.dot(n)*(1-o.squash));
      sp.setXYZ(i,v.x,v.y,v.z);
    }
    sg.computeVertexNormals();
    sg.translate(P.x,P.y,P.z);

    var mat=new THREE.MeshPhysicalMaterial({color:o.color,emissive:0xffffff,emissiveIntensity:o.emi,roughness:o.rough,
      sheen:1,sheenRoughness:.55,sheenColor:0xFFF6EE});
    var ball,bones=[],skinned=!!(body.isSkinnedMesh&&body.skeleton&&geo.attributes.skinIndex);
    if(skinned){
      /* 环顶点骨权重累加，取前 4 根，归一化 */
      var si=geo.attributes.skinIndex,sw=geo.attributes.skinWeight,acc={};
      best.ring.forEach(function(k){for(var c=0;c<4;c++){var b=si.getComponent(k,c),w=sw.getComponent(k,c);if(w>0)acc[b]=(acc[b]||0)+w;}});
      var top=Object.keys(acc).map(function(b){return [+b,acc[b]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,4);
      var sum=top.reduce(function(s,x){return s+x[1];},0)||1;
      while(top.length<4)top.push([0,0]);
      var cnt=sg.attributes.position.count,ia=new Uint16Array(cnt*4),wa=new Float32Array(cnt*4);
      for(var i=0;i<cnt;i++)for(var c=0;c<4;c++){ia[i*4+c]=top[c][0];wa[i*4+c]=top[c][1]/sum;}
      sg.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ia,4));
      sg.setAttribute('skinWeight',new THREE.Float32BufferAttribute(wa,4));
      top.forEach(function(x){if(x[1]>0)bones.push({name:body.skeleton.bones[x[0]].name,w:+(x[1]/sum).toFixed(4)});});
      ball=new THREE.SkinnedMesh(sg,mat);
      ball.position.copy(body.position);ball.quaternion.copy(body.quaternion);ball.scale.copy(body.scale);
      body.parent.add(ball);
      ball.bind(body.skeleton,body.bindMatrix);
    }else{
      ball=new THREE.Mesh(sg,mat);
      body.add(ball);
    }
    ball.name='BunnyTailBall';ball.userData.noFurify=true;
    ball.castShadow=ball.receiveShadow=true;ball.frustumCulled=false;

    var rc=P.clone().applyMatrix4(best.e.toRoot);
    var r4=function(x){return +x.toFixed(4);};
    var res={skinned:skinned,center:P.toArray().map(r4),rootCenter:rc.toArray().map(r4),radius:r4(R),
      normal:n.toArray().map(r4),nx0:nx0,bones:bones,cutFaces:totalCut,ringCount:best.ring.size,opts:o};
    root.userData.bunnyTail=res;
    return res;
  }

  window.BunnyTail={DEFAULTS:DEFAULTS,applyTail:applyTail};
})();
