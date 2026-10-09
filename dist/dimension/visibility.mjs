// Orthographic visibility of a closed, convex, genuinely 3D mesh.
// This changes styling only. It makes no occlusion claim about a 4D context view.
export function convexVisibility3(mesh, camera = [0, Math.sin(.5), Math.cos(.5)], grazing = .08) {
  const {verts, edges = [], facets = []} = mesh;
  const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const unit = a => { const l = Math.hypot(...a); return l > 0 ? a.map(v => v/l) : [0,0,0]; };
  const toward = unit(camera);
  const mean = ids => [0,1,2].map(k => ids.reduce((sum,i) => sum+verts[i][k], 0)/ids.length);
  const center = verts.length ? mean(verts.map((_,i) => i)) : [0,0,0];
  const ramp = value => { const t = Math.max(0, Math.min(1, value/grazing)); return t*t*(3-2*t); };
  const key = (a,b) => a < b ? a+':'+b : b+':'+a;
  const adjacent = new Map();
  const faces = facets.map(face => {
    const ids = Array.isArray(face) ? face : face.ids;
    const centroid = mean(ids);
    // Recompute from displayed coordinates so winding and transformed inputs
    // cannot silently reverse lighting. A largest fan triangle avoids relying
    // on the first three vertices being non-collinear or on an absolute epsilon.
    let normal = [0,0,0], best = 0;
    for (let i=1; i+1<ids.length; i++) {
      const n = cross(sub(verts[ids[i]],verts[ids[0]]),sub(verts[ids[i+1]],verts[ids[0]]));
      const length = Math.hypot(...n);
      if (length > best) { best = length; normal = n; }
    }
    if (!best && !Array.isArray(face) && face.normal) normal = face.normal.slice(0,3);
    normal = unit(normal);
    if (dot(normal,sub(centroid,center)) < 0) normal = normal.map(v => -v);
    const facing = dot(normal,toward), front = ramp(facing);
    const result = {ids, normal, centroid, facing, front, depth:dot(centroid,toward)};
    for (let i=0; i<ids.length; i++) {
      const edgeKey = key(ids[i],ids[(i+1)%ids.length]);
      if (!adjacent.has(edgeKey)) adjacent.set(edgeKey,[]);
      adjacent.get(edgeKey).push(result);
    }
    return result;
  });
  const styledEdges = edges.map(edge => {
    const neighbors = adjacent.get(key(...edge)) || [];
    const max = neighbors.length ? Math.max(...neighbors.map(f=>f.facing)) : 0;
    const min = neighbors.length ? Math.min(...neighbors.map(f=>f.facing)) : 0;
    const front = ramp(max), silhouette = front*(1-ramp(min));
    return {edge, adjacent:neighbors, front, silhouette,
      alpha:.10+.64*front+.18*silhouette,
      width:.70+.55*front+.28*silhouette};
  });
  return {faces, edges:styledEdges};
}
