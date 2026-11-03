"""Browser acceptance tests. They require a browser without managed URL-blocking policy."""
import contextlib
import functools
import http.server
import pathlib
import socketserver
import threading
import pytest
from playwright.sync_api import sync_playwright, Error as PlaywrightError

ROOT=pathlib.Path(__file__).parents[2] / 'dist'

@pytest.fixture(scope='session')
def origin():
    Handler=functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    class Server(socketserver.TCPServer):
        allow_reuse_address=True
    server=Server(('127.0.0.1',0),Handler)
    thread=threading.Thread(target=server.serve_forever, daemon=True);thread.start()
    yield f'http://127.0.0.1:{server.server_address[1]}/'
    server.shutdown();server.server_close()

@pytest.fixture
def page(origin):
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        ctx=browser.new_context(viewport={'width':1280,'height':800})
        tab=ctx.new_page();errors=[]
        tab.on('pageerror',lambda err:errors.append(str(err)))
        try:
            tab.goto(origin,wait_until='domcontentloaded',timeout=12000)
        except PlaywrightError as exc:
            if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(exc):
                browser.close()
                pytest.skip('Managed Chromium policy blocks all navigation, including localhost and data: URLs')
            raise
        tab.locator('.square').first.wait_for(timeout=15000)
        yield tab
        assert not errors,errors
        ctx.close();browser.close()

def test_desktop_board(page):
    assert page.locator('.square').count()==64
    assert page.get_by_role('heading',name='The Practice Board').count()==1
    assert page.locator('main').evaluate('(el)=>el.scrollWidth<=el.clientWidth')

def test_legal_move_and_local_engine_reply(page):
    page.get_by_role('textbox',name='Enter move in algebraic notation').fill('e4')
    page.locator('#move-form button').click()
    page.get_by_text('Engine played',exact=False).first.wait_for(timeout=30000)
    assert page.locator('.move-chip').count()>=2

def test_opening_and_visualization(page):
    page.get_by_role('button',name='Opening Dojo').click()
    page.get_by_role('heading',name='Opening Dojo').wait_for()
    page.locator('#drill-mode').click()
    page.locator('#opening-move').fill('e4')
    page.locator('#opening-move-form button').click()
    assert page.locator('.square').count()==64
    page.get_by_role('button',name='Visualization').click()
    page.get_by_role('button',name='Square Color').click()
    page.get_by_role('button',name='Dark square').click()
    assert page.get_by_text('a1 is dark').count()>=1

def test_master_and_mobile_layout(page):
    page.get_by_role('button',name='Master Games').click()
    assert page.locator('.move-chip').count()>=30
    page.set_viewport_size({'width':390,'height':844})
    assert page.locator('main').evaluate('(el)=>el.scrollWidth<=el.clientWidth')
    assert page.locator('.board-mount').bounding_box()['width']<=390
