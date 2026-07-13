FROM python:3.12-slim

WORKDIR /repo
COPY apps/api /repo/apps/api
COPY workers /repo/workers
RUN pip install --no-cache-dir -e /repo/apps/api
CMD ["python", "workers/scheduler/main.py"]

