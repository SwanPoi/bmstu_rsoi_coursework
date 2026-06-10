#!/bin/bash
NAMESPACE="test"

echo "=== Создание namespace $NAMESPACE ==="
kubectl create namespace $NAMESPACE || echo "Namespace уже существует"

echo "=== Установка Helm чартов ==="
install_chart() {
    local name=$1
    local path=$2
    local label=$3
    echo "- Установка/обновление $name -"
    helm upgrade --install -n $NAMESPACE $name $path
    echo "- Ожидание готовности подов $name -"
    kubectl wait --for=condition=ready pod -n $NAMESPACE -l app=$label --timeout=300s
}

install_chart postgres ./k8s/postgres postgres
install_chart redis ./k8s/redis redis

echo "- Установка Kafka -"
helm upgrade --install -n $NAMESPACE kafka ./k8s/kafka
echo "- Ожидание готовности Kafka -"
kubectl wait --for=condition=ready pod -n $NAMESPACE -l app=kafka --timeout=300s

install_chart idp ./k8s/idp idp

echo "- Установка основных сервисов -"
helm upgrade --install -n $NAMESPACE services ./k8s/services
echo "- Ожидание готовности сервисов -"
for app in gateway cars rental payment stats; do
    kubectl wait -n $NAMESPACE -l app=$app pod --for=condition=ready --timeout=3m
done

echo "- Развертывание фронтенда -"
install_chart frontend ./k8s/frontend frontend

echo "=== Развертывание Ingress ==="
kubectl apply -f ./k8s/ingress.yaml -n $NAMESPACE

echo "=== Настройка проброса портов (Port Forwarding) ==="
rm -f /tmp/car-rental-pf-*.pid

echo "- Запуск проброса портов для IdP (8090) ..."
kubectl port-forward svc/idp-svc 8090:8090 -n test > /dev/null 2>&1 &
echo $! > /tmp/car-rental-pf-idp.pid

echo "- Запуск проброса портов для Gateway (8081) ..."
kubectl port-forward svc/gateway-svc 8081:8080 -n test > /dev/null 2>&1 &
echo $! > /tmp/car-rental-pf-gateway.pid

echo "- Запуск проброса портов для Frontend (4200) ..."
kubectl port-forward svc/frontend-svc 4200:80 -n test > /dev/null 2>&1 &
echo $! > /tmp/car-rental-pf-frontend.pid

# Небольшая пауза для гарантированного установления соединений
sleep 3

echo "Готово! Сервисы развернуты в namespace $NAMESPACE и доступны локально:"
echo "  Frontend:       http://localhost:4200"
echo "  Gateway API:    http://localhost:8081"
echo "  Identity Provider: http://localhost:8090"
echo ""
echo "Для проверки состояния выполните: kubectl get pods -n $NAMESPACE"
echo "Для корректной остановки проброса портов и очистки выполните: ./cleanup.sh"

# Полезные команды для отладки:
# kubectl port-forward service/ingress-nginx-controller -n ingress-nginx 8080:80
# kubectl port-forward svc/idp-svc 8090:8090 -n test
# kubectl port-forward svc/gateway-svc 8081:8080 -n test
# kubectl port-forward svc/frontend-svc 4200:80 -n test
# kubectl exec -it $(kubectl get pods -n test -l app=postgres -o jsonpath='{.items[0].metadata.name}') -n test -- psql -U program -d idp -c "SELECT * FROM users;"
# kubectl logs -f -l app=kafka -n test
# kubectl logs -f -l app=stats -n test