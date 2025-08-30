@echo off
setlocal enabledelayedexpansion

echo Iniciando teste de carga do AEC-Axis...
echo =======================================

set "url=http://localhost:8000/"
set "total_requests=100"
set "concurrent=5"

echo URL: %url%
echo Total de requisicoes: %total_requests%
echo Concorrencia simulada: %concurrent%
echo.

set "sum=0"
set "count=0"
set "min=99999"
set "max=0"
set "success=0"
set "errors=0"

echo Executando teste...

for /L %%i in (1,1,%total_requests%) do (
    set "start_time=!time!"
    
    for /f "tokens=*" %%a in ('curl -o NUL -s -w "%%{time_total};%%{http_code}" %url%') do (
        set "result=%%a"
        for /f "tokens=1,2 delims=;" %%b in ("!result!") do (
            set "response_time=%%b"
            set "status_code=%%c"
            
            REM Convert response time to milliseconds (multiply by 1000)
            set /a "time_ms=!response_time:~0,1!!response_time:~2,3!"
            
            if "!status_code!"=="200" (
                set /a "success+=1"
                set /a "sum+=!time_ms!"
                set /a "count+=1"
                
                if !time_ms! LSS !min! set "min=!time_ms!"
                if !time_ms! GTR !max! set "max=!time_ms!"
                
            ) else (
                set /a "errors+=1"
                echo Erro: Status !status_code! na requisicao %%i
            )
        )
    )
    
    REM Progress indicator
    set /a "progress=%%i*100/total_requests"
    if %%i EQU 10 echo 10%% concluido...
    if %%i EQU 25 echo 25%% concluido...
    if %%i EQU 50 echo 50%% concluido...
    if %%i EQU 75 echo 75%% concluido...
)

echo.
echo RESULTADOS DO TESTE DE PERFORMANCE
echo ==================================
echo.
echo Total de requisicoes: %total_requests%
echo Sucessos: !success!
echo Erros: !errors!

if !count! GTR 0 (
    set /a "avg=!sum!/!count!"
    echo.
    echo METRICAS DE TEMPO DE RESPOSTA (ms):
    echo Minimo: !min!ms
    echo Maximo: !max!ms  
    echo Media: !avg!ms
    echo.
    
    set /a "success_rate=!success!*100/!total_requests!"
    echo Taxa de sucesso: !success_rate!%%
    
    REM Calculate approximate RPS (very rough estimation)
    set /a "avg_rps=1000/!avg!"
    echo RPS aproximado: !avg_rps! req/s
    
) else (
    echo Nenhuma requisicao bem-sucedida para calcular metricas.
)

echo.
echo Teste concluido!
echo.

pause