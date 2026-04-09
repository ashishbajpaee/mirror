import asyncio
import websockets

async def test():
    try:
        print("Connecting...")
        async with websockets.connect('ws://localhost:8001/ws/real') as ws:
            print('Connected!')
            res = await ws.recv()
            print('Received data:', len(res), 'bytes')
    except Exception as e:
        print('Exception:', e)

asyncio.run(test())
