"""
Workaround for loading Keras 2.x HDF5 models in Keras 3.x environment.
Uses custom_objects to patch the DepthwiseConv2D deserialization.
"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import sys
import numpy as np
import tensorflow as tf
from tensorflow.keras.layers import DepthwiseConv2D as OriginalDepthwiseConv2D
from tensorflow.keras.models import load_model
from PIL import Image, ImageOps
from sklearn.metrics import confusion_matrix, classification_report
import seaborn as sns
import matplotlib.pyplot as plt

# ═════════════════════════════════════════════════════════════════
# PATCH: Custom DepthwiseConv2D that accepts 'groups' parameter
# ═════════════════════════════════════════════════════════════════
class PatchedDepthwiseConv2D(OriginalDepthwiseConv2D):
    """DepthwiseConv2D that ignores the 'groups' parameter for compatibility"""
    
    def __init__(self, *args, **kwargs):
        # Remove 'groups' if present (Keras 2.x parameter, doesn't exist in Keras 3.x)
        kwargs.pop('groups', None)
        super().__init__(*args, **kwargs)
    
    @classmethod
    def from_config(cls, config):
        config = config.copy()
        config.pop('groups', None)
        return cls(**config)

# ═════════════════════════════════════════════════════════════════
# STEP 0: VERIFY MODEL FILE
# ═════════════════════════════════════════════════════════════════
print("=" * 70)
print("X-Ray Fracture Detection - Model Evaluation")
print("=" * 70)

if not os.path.exists("keras_model.h5"):
    print("❌ ERROR: keras_model.h5 not found in current directory")
    print("\nPlease ensure keras_model.h5 is present in /evaluation/")
    sys.exit(1)

file_size = os.path.getsize("keras_model.h5")
if file_size == 0:
    print("❌ ERROR: keras_model.h5 is empty (0 bytes)")
    print("❌ The model file was not properly saved or uploaded")
    sys.exit(1)

print(f"✓ Model file found: {file_size:,} bytes")

# Load model with custom objects to handle Keras 2/3 compatibility
try:
    print("\n⏳ Loading Keras model with compatibility patch...")
    
    custom_objects = {
        'DepthwiseConv2D': PatchedDepthwiseConv2D
    }
    
    model = load_model("keras_model.h5", compile=False, custom_objects=custom_objects)
    print(f"✓ Model loaded successfully!")
    print(f"  Input shape: {model.input_shape}")
    print(f"  Output shape: {model.output_shape}")
    
except Exception as e:
    print(f"❌ ERROR: Failed to load model even with patch")
    print(f"   {type(e).__name__}: {str(e)[:300]}")
    print("\nThis model may have additional Keras 2.x incompatibilities")
    print("Solution: Retrain with Keras 3.x/TensorFlow 2.21+")
    sys.exit(1)

# Load labels
try:
    class_names = open("labels.txt", "r").readlines()
    print(f"✓ Labels loaded: {[c.strip() for c in class_names]}")
except FileNotFoundError:
    print("❌ ERROR: labels.txt not found")
    sys.exit(1)

IMG_SIZE = 224

X = []
y_true = []

# Dataset folder
TEST_DIR = "test"

# ═════════════════════════════════════════════════════════════════
# STEP 1: LOAD TEST DATA
# ═════════════════════════════════════════════════════════════════
print("\n⏳ Loading test dataset...")

try:
    for label, folder in enumerate(["normal", "fracture"]):
        path = os.path.join(TEST_DIR, folder)
        if not os.path.isdir(path):
            print(f"⚠ Warning: {path} not found, skipping")
            continue

        file_count = len(os.listdir(path))
        print(f"  {folder}: {file_count} files")

        for file in os.listdir(path):
            img = Image.open(os.path.join(path, file)).convert("RGB")
            img = ImageOps.fit(img, (IMG_SIZE, IMG_SIZE), Image.Resampling.LANCZOS)

            img_array = np.asarray(img)
            normalized = (img_array.astype(np.float32) / 127.5) - 1

            X.append(normalized)
            y_true.append(label)

    if len(X) == 0:
        print("❌ ERROR: No test images found")
        sys.exit(1)

    X = np.array(X)
    y_true = np.array(y_true)
    print(f"✓ Loaded {len(X)} test images")
    
except Exception as e:
    print(f"❌ ERROR loading images: {e}")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════
# STEP 2: PREDICTIONS
# ═════════════════════════════════════════════════════════════════
print("\n⏳ Running predictions...")
predictions = model.predict(X)
y_pred = np.argmax(predictions, axis=1)
print(f"✓ Predictions complete")

# ═════════════════════════════════════════════════════════════════
# STEP 3: EVALUATE
# ═════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)

# Confusion Matrix
cm = confusion_matrix(y_true, y_pred)

print("\nConfusion Matrix:")
print(cm)

print("\nClassification Report:")
print(classification_report(y_true, y_pred, target_names=["Normal", "Fracture"]))

# Plot
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=["Normal", "Fracture"],
            yticklabels=["Normal", "Fracture"])

plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.title("Confusion Matrix - Fracture Detection Model")
plt.tight_layout()

output_path = "confusion_matrix.png"
plt.savefig(output_path, dpi=150, bbox_inches='tight')
print(f"\n✓ Confusion matrix saved to: {output_path}")

plt.show()

print("\n" + "=" * 70)
print("Evaluation complete!")
print("=" * 70)
