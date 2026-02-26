docker compose down
docker compose build --no-cache --pull
docker compose up

- подтянет изменения, перезагрузит только app (без бд, phpMA и тд.)
docker compose restart app
