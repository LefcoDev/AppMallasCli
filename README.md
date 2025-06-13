# Git Commands Reference

## Remote Management
```bash
# Ver todos los remotes actuales
git remote -v

# Eliminar remote origin
git remote remove origin

# Agregar nuevo remote origin
git remote add origin <url>

# Cambiar URL del remote origin
git remote set-url origin <nueva-url>
```

## Branch Management
```bash
# Ver todas las branches
git branch

# Ver branches locales y remotas
git branch -a

# Crear y cambiar a nueva branch
git checkout -b <nombre-branch>
git switch -c <nombre-branch>  # Git 2.23+

# Crear branch sin cambiar a ella
git branch <nombre-branch>

# Cambiar a branch existente
git checkout <nombre-branch>
git switch <nombre-branch>  # Git 2.23+

# Crear branch desde otra branch específica
git checkout -b <nueva-branch> <branch-origen>
```

## Basic Commands
```bash
# Ver estado actual
git status

# Agregar archivos al staging
git add .
git add <archivo>

# Hacer commit
git commit -m "mensaje"

# Subir branch al remote
git push -u origin <nombre-branch>

# Push normal
git push
```

## Verification
```bash
# Ver branch actual (marcada con *)
git branch

# Ver último commit
git log --oneline -1

# Ver diferencias
git diff
```
