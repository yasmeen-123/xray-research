import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import classification_report, confusion_matrix, roc_curve, auc
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns

# Load model
model = tf.keras.models.load_model("fracture_model.h5")

# Load test data
test_gen = ImageDataGenerator(rescale=1./255)

test_data = test_gen.flow_from_directory(
    "dataset/test",
    target_size=(224,224),
    batch_size=1,
    class_mode='binary',
    shuffle=False
)

# Predictions
preds = model.predict(test_data)
y_pred = (preds > 0.5).astype(int).flatten()
y_true = test_data.classes

# -------------------------
# CONFUSION MATRIX
# -------------------------
cm = confusion_matrix(y_true, y_pred)

plt.figure()
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
            xticklabels=["Normal", "Fracture"],
            yticklabels=["Normal", "Fracture"])
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.title("Confusion Matrix")
plt.savefig("confusion_matrix.png")
plt.show()

# -------------------------
# ROC CURVE
# -------------------------
fpr, tpr, _ = roc_curve(y_true, preds)
roc_auc = auc(fpr, tpr)

plt.figure()
plt.plot(fpr, tpr, label=f"AUC = {roc_auc:.2f}")
plt.plot([0,1], [0,1], linestyle='--')
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC Curve")
plt.legend()
plt.savefig("roc_curve.png")
plt.show()

# -------------------------
# REPORT
# -------------------------
print(confusion_matrix(y_true, y_pred))
print(classification_report(y_true, y_pred))