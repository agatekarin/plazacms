## docker
docker-compose down -v
docker-compose up -d --build

## db
PS A:\dev\plazacms> type .mysetting/schema.sql | docker exec -i 5d2a9bff2251a1e8a36818a28726ffa16d3c705859a080527b459cff63c26a4a psql -U admin -d plazacms