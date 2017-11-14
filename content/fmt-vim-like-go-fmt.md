# Vim 中的制表符缩进与空格对齐

没有频繁地编写 Go 程序之前, 觉得空格缩进的世界算是相当的美好的, 然而被 `go fmt`
宠溺之后, 发现 *indent with tabs, align with spaces* 实在是太舒服了,
尤其是在其他语言中为可读性做缩进调整的时候, 完全不费什么功夫.

学习 `go fmt` 的思路, 可以尝试改造一下自己在 Vim 里头的习惯.  在 Vim 的 FANDOM
社区里头偷到了叫 *SuperRetab* 还有 *Space2Tab* 这样的命令,
可以把代码中用于缩进的空格转为制表符.

```
" Space2Tab.
command! -range=% -nargs=0 Space2Tab execute
  \ ':silent! <line1>,<line2>s#^\( \{'.&ts.
  \ '\}\)\+#\=repeat("\t", len(submatch(0))/'.&ts.')'
```

注意一下这个版本和 FANDOM 的是不一样的, 我增加了 `:silent!` 字段,
让命令找不到合适的 pattern 的时候不会在状态栏报错, 不然报错会把整个 buffer
挤的一团糟, 更别说还要多按一个键关掉它.

接下来, 就是使用 `autocmd` 监听相关事件来执行它了.  vim-go
插件是在缓冲区保存时帮助用户执行 `go fmt` 统一代码风格, 所以大可模仿这样的机制,
监听 `BufWritePre` 事件.  这里我只监听了我常用的 C/C++ 的后缀名.

```
autocmd BufWritePre *.c,*.cc,*.h,*.hpp,*.cpp Space2Tab
```

除此之外, 还可以设置 `cindent` 来使类似函数参数换行这样的情况也能优雅地对齐,
比如这样的代码:

```c
void
foo()
{
    bar(1,
        2); // 像这样的对齐
}
```

`Space2Tab` 对此的表现相当的出色, 可以多写点例子测试两下.

出于个人习惯, 我还增加了一个快捷键, 用于在一行代码前增添/删除一个 `// ` 字段,
其实就是注释的 toggle.  这里用到的特性叫做 `<localleader>`,
十分适合做个人偏好的快捷键扩展.  例如, `<localleader>c` 指的是按下
<kbd>&bsol;</kbd> 和 <kbd>C</kbd> 键 (输入小写 c) 这个动作.

这一段的配置长这样.

```
" Other utils.
autocmd BufEnter *.c,*.cc,*.h,*.hpp,*.cpp call SetCppOptions()
function SetCppOptions()
  nnoremap <buffer> <localleader>c I// <esc>
  nnoremap <buffer> <localleader>C ^xxx
  setlocal cindent
  setlocal cinoptions=(0,u0,U0
endfunction
```

好了, 这下可以轻松享受无任何插件依赖的所谓 `gcc fmt`/`g++ fmt` 了,
忍不住多写了一些代码.
