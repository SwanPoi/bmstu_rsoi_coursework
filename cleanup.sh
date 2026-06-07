#!/bin/bash
NAMESPACE="test"
echo "=== Очистка ресурсов в namespace $NAMESPACE ==="

echo "- Удаление Ingress -"
kubectl delete ingress car-rental-ingress -n $NAMESPACE --ignore-not-found=true

echo "- Удаление Helm релизов -"
helm uninstall -n $NAMESPACE services --ignore-not-found || true
helm uninstall -n $NAMESPACE idp --ignore-not-found || true
helm uninstall -n $NAMESPACE postgres --ignore-not-found || true
helm uninstall -n $NAMESPACE redis --ignore-not-found || true

echo "- Ожидание завершения удаления подов -"
sleep 5

echo "- Удаление namespace $NAMESPACE -"
kubectl delete namespace $NAMESPACE --ignore-not-found=true

echo "Очистка завершена."