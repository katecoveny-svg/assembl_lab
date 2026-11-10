"""Material-fidelity regression for the AR converter. Run with usd-core and numpy."""
import io
import zipfile
from PIL import Image
import json
import os
import struct
import tempfile
import unittest
import numpy as np
from pxr import Usd, UsdGeom, UsdShade
from glb2usdz import convert


def fixture(path, include_uv=True):
    # One triangle, an embedded PNG, and independently transformed material maps.
    image=io.BytesIO();Image.new('RGB',(1,1),(128,192,240)).save(image,format='PNG');png=image.getvalue()
    pos=np.array([[0,0,0],[1,0,0],[0,1,0]],dtype='<f4').tobytes()
    uv=np.array([[0,0],[1,0],[0,1]],dtype='<f4').tobytes()
    normal=np.array([[0,0,1]]*3,dtype='<f4').tobytes()
    chunks=[pos,uv,normal,png]; blob=b'';views=[]
    for data in chunks:
        views.append({'buffer':0,'byteOffset':len(blob),'byteLength':len(data)})
        blob+=data;blob+=b'\0'*((-len(blob))%4)
    info={'index':0,'extensions':{'KHR_texture_transform':{'offset':[.125,.25],'scale':[2,3]}}}
    j={'asset':{'version':'2.0'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0}],
       'buffers':[{'byteLength':len(blob)}],'bufferViews':views,
       'accessors':[{'bufferView':i,'componentType':5126,'count':3,'type':t} for i,t in enumerate(['VEC3','VEC2','VEC3'])],
       'images':[{'bufferView':3,'mimeType':'image/png'}],'textures':[{'source':0}],
       'materials':[{'name':'Detailed','normalTexture':dict(info,scale=.25),
          'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'roughnessFactor':.6,'metallicFactor':.4,'metallicRoughnessTexture':info}}],
       'meshes':[{'primitives':[{'attributes':dict({'POSITION':0,'NORMAL':2},**({'TEXCOORD_0':1} if include_uv else {})),'material':0}]}]}
    raw=json.dumps(j).encode();raw+=b' '*((-len(raw))%4)
    data=struct.pack('<III',0x46546c67,2,12+8+len(raw)+8+len(blob))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(blob),0x004e4942)+blob
    with open(path,'wb') as f:f.write(data)


class MaterialFidelity(unittest.TestCase):
    def test_surface_channels_and_independent_uvs(self):
        with tempfile.TemporaryDirectory() as temp:
            glb=os.path.join(temp,'fixture.glb');usd=os.path.join(temp,'fixture.usdz');fixture(glb)
            result=convert(glb,usd);self.assertEqual(result['triangles'],1)
            stage=Usd.Stage.Open(usd)
            normal=UsdShade.Shader(stage.GetPrimAtPath('/Root/Materials/Detailed/normalMap'))
            self.assertEqual(normal.GetInput('sourceColorSpace').Get(),'raw')
            np.testing.assert_allclose(normal.GetInput('scale').Get(),[2,2,2,1])
            np.testing.assert_allclose(normal.GetInput('bias').Get(),[-1,-1,-1,0])
            with zipfile.ZipFile(usd) as archive:
                image=Image.open(io.BytesIO(archive.read(normal.GetInput('file').Get().path.removeprefix('./'))))
                value=np.array(image,dtype=float)[0,0]/255*2-1
                expected=(np.array([128,192,240])/255*2-1)*[.25,.25,1]
                expected/=np.linalg.norm(expected)
                np.testing.assert_allclose(value,expected,atol=1/255)
            surface=UsdShade.Shader(stage.GetPrimAtPath('/Root/Materials/Detailed/Surface'))
            self.assertTrue(surface.GetInput('normal').HasConnectedSource())
            self.assertEqual(str(surface.GetInput('roughness').GetConnectedSource()[1]),'g')
            self.assertEqual(str(surface.GetInput('metallic').GetConnectedSource()[1]),'b')
            mr=UsdShade.Shader(stage.GetPrimAtPath('/Root/Materials/Detailed/metallicRoughness'))
            np.testing.assert_allclose(mr.GetInput('scale').Get(),[1,.6,.4,1])
            mesh=next(p for p in stage.Traverse() if p.IsA(UsdGeom.Mesh));api=UsdGeom.PrimvarsAPI(mesh)
            np.testing.assert_allclose(api.GetPrimvar('st').Get(),[[0,1],[1,1],[0,0]])
            expected=[[.125,.75],[2.125,.75],[.125,-2.25]]
            for name in ['st_normalMap','st_metallicRoughness']:
                np.testing.assert_allclose(api.GetPrimvar(name).Get(),expected)

    def test_missing_required_uv_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            glb=os.path.join(temp,'fixture.glb');fixture(glb,False)
            with self.assertRaisesRegex(ValueError,'Missing TEXCOORD_0'):
                convert(glb,os.path.join(temp,'fixture.usdz'))

if __name__=='__main__':unittest.main()
