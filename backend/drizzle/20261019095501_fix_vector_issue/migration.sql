CREATE INDEX "job_requirements_embedding_index" ON "job_requirements" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "job_requirements_job_id_index" ON "job_requirements" ("job_id");--> statement-breakpoint
CREATE INDEX "resume_chunks_embedding_idx" ON "resume_chunks" USING hnsw ("embedding" vector_cosine_ops);