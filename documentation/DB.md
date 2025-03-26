This is a collection of some important non-obvious things to note in the db:

users --> level (int) is mapped to each company admin_config

job_queue --> status (int) is mapped to:
-1 = failed
0 = pending
1 = in progress
2 = completed
3 = cancelled
4 = paused
