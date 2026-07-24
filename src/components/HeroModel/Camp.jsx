import { useGLTF } from "@react-three/drei";

function Camp() {
  const { scene } = useGLTF(
    "https://fxxhulofehjazeepbxnx.storage.supabase.co/storage/v1/object/public/3D%20models/SM_Camp.glb"
  );

  return (
    <primitive
      object={scene}
      scale={1}
      position={[0, 0, 0]}
    />
  );
}

export default Camp;