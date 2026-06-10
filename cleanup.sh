#!/bin/bash
NAMESPACE="test"

echo "=== Очистка ресурсов в namespace $NAMESPACE ==="

echo "- Остановка проброса портов (Port Forwarding) -"
for pidfile in /tmp/car-rental-pf-*.pid; do
    if [ -f "$pidfile" ]; then
        pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null; then
            echo "  Остановка процесса port-forward (PID: $pid) ..."
            kill "$pid" 2>/dev/null
        fi
        rm -f "$pidfile"
    fi
done
echo "  Проброс портов остановлен."
echo ""

echo "- Удаление Ingress -"
kubectl delete ingress car-rental-ingress -n $NAMESPACE --ignore-not-found=true

echo "- Удаление Helm релизов -"
helm uninstall -n $NAMESPACE frontend --ignore-not-found || true
helm uninstall -n $NAMESPACE services --ignore-not-found || true
helm uninstall -n $NAMESPACE kafka --ignore-not-found || true
helm uninstall -n $NAMESPACE idp --ignore-not-found || true
helm uninstall -n $NAMESPACE postgres --ignore-not-found || true
helm uninstall -n $NAMESPACE redis --ignore-not-found || true

echo "- Ожидание завершения удаления подов -"
sleep 5

echo "- Удаление PVC (Persistent Volume Claims) для очистки данных -"
kubectl delete pvc -n $NAMESPACE -l app=postgres --ignore-not-found=true
kubectl delete pvc -n $NAMESPACE -l app=kafka --ignore-not-found=true

echo "- Удаление namespace $NAMESPACE -"
kubectl delete namespace $NAMESPACE --ignore-not-found=true

echo "Очистка завершена."