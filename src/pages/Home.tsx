import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonCard, IonCardContent } from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import React, { useState, useRef } from 'react';
import { processXraySignal } from '../dspEngine'; 

const Home: React.FC = () => {
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const captureAndProcess = async () => {
    // 1. Capture the Image (Signal Acquisition)
    const image = await Camera.getPhoto({
      quality: 90,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera 
    });
    setPhoto(image.webPath);

    // 2. Prepare the Canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      // 3. Execute DSP Algorithm
      processXraySignal(canvas);
    };
    img.src = image.webPath!;
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="tertiary">
          <IonTitle>X-Ray DSP Lab</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding ion-text-center">
        <IonCard>
          <IonCardContent>
            <h2>Research Interface</h2>
            <p>Capturing an X-ray film photo converts an optical signal to a digital matrix for processing.</p>
            <IonButton onClick={captureAndProcess} expand="block" color="primary">
              Capture & Analyze X-Ray
            </IonButton>
          </IonCardContent>
        </IonCard>

        <div style={{ marginTop: '20px' }}>
          <h3>Enhanced DSP Output:</h3>
          <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: '10px', border: '1px solid #555' }} />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;